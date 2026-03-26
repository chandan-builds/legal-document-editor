import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { UserService } from './user.service';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════════════

  async register(dto: RegisterDto) {
    const user = await this.userService.create({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      role: dto.role,
      organizationId: dto.organizationId,
    });

    this.logger.log(`User registered: ${user.email}`);
    return { message: 'Registration successful', user };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOGIN — with account lockout
  // ═══════════════════════════════════════════════════════════════════════

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const remainingMs = user.accountLockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingMins} minute(s).`,
      );
    }

    const isPasswordValid = await this.userService.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.accountLockedUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MS,
        );
        this.logger.warn(
          `Account locked for ${user.email} after ${attempts} failed attempts`,
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, accountLockedUntil: null },
      });
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════════════════════════

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const newAccessToken = this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(storedToken.userId);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOGOUT ALL DEVICES
  // ═══════════════════════════════════════════════════════════════════════

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    this.logger.log(`All sessions revoked for user: ${userId}`);
    return { message: 'All sessions revoked successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANGE PASSWORD (authenticated)
  // ═══════════════════════════════════════════════════════════════════════

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all sessions
    await this.logoutAll(userId);

    this.logger.log(`Password changed for user: ${user.email}`);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FORGOT PASSWORD — generate reset token
  // ═══════════════════════════════════════════════════════════════════════

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);

    // Always return success (prevents email enumeration)
    const successMessage =
      'If an account with that email exists, a reset link has been sent.';

    if (!user) {
      return { message: successMessage };
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    this.logger.log(`Password reset token generated for: ${user.email}`);

    // In production, send email here. For now, return token in response.
    return {
      message: successMessage,
      // DEV ONLY — remove in production when email service is integrated
      resetToken: rawToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RESET PASSWORD — validate token and set new password
  // ═══════════════════════════════════════════════════════════════════════

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

    // Invalidate all sessions
    await this.logoutAll(user.id);

    this.logger.log(`Password reset completed for: ${user.email}`);
    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GET ME
  // ═══════════════════════════════════════════════════════════════════════

  async getMe(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    displayName: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    const expiresAt = this.calculateExpiry(expiresIn);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };
    return new Date(
      Date.now() + value * (multipliers[unit] || multipliers['d']),
    );
  }
}

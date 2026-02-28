import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { UserService } from './user.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Register a new user
   */
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

  /**
   * Authenticate user and return JWT access + refresh tokens
   */
  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.userService.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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

  /**
   * Refresh access token using a valid refresh token
   */
  async refresh(refreshToken: string) {
    // Hash the incoming token to compare with stored hash
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

    // Rotate: revoke old token and issue new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const newAccessToken = this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(storedToken.userId);

    this.logger.debug(`Token refreshed for user: ${storedToken.user.email}`);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Revoke a refresh token (logout)
   */
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });

    this.logger.debug('User logged out, refresh token revoked');
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user from JWT payload
   */
  async getMe(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // ── Private helpers ──────────────────────────────────────

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
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
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

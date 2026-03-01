import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  SearchUsersDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { UserService } from './user.service';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) { }

  /** Cookie config — httpOnly, secure, SameSite=None for cross-domain */
  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
    };
  }

  // ─── REGISTER ────────────────────────────────────────────────────────
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─── LOGIN ───────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);

    const cookieOptions = this.getCookieOptions();

    res.cookie('access_token', result.access_token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refresh_token', result.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    };
  }

  // ─── REFRESH ─────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.refresh(dto.refreshToken);

    const cookieOptions = this.getCookieOptions();
    res.cookie('access_token', result.access_token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: any,
  ) {
    await this.authService.logout(dto.refreshToken);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  // ─── LOGOUT ALL DEVICES ──────────────────────────────────────────────
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.logoutAll(req.user.userId);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return result;
  }

  // ─── CHANGE PASSWORD ────────────────────────────────────────────────
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.changePassword(req.user.userId, dto);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return result;
  }

  // ─── FORGOT PASSWORD ────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─── RESET PASSWORD ─────────────────────────────────────────────────
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── GET ME ──────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  // ─── SEARCH USERS ────────────────────────────────────────────────────
  @Post('users/search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Body() dto: SearchUsersDto) {
    return this.userService.searchUsers(dto.query);
  }
}
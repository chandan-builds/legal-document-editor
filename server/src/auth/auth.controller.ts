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
import { RegisterDto, LoginDto, RefreshTokenDto, SearchUsersDto } from './dto';
import { UserService } from './user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * Helper function for cookie config
   */
  private getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProd, // must be true in production (HTTPS required)
      sameSite: isProd ? 'none' : 'lax', // required for cross-site in production
    } as const;
  }

  /**
   * POST /auth/register — Create a new user account
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login — Authenticate and get JWT + refresh token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);

    const cookieOptions = this.getCookieOptions();

    res.cookie('access_token', result.access_token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.cookie('refresh_token', result.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      access_token: result.access_token,
    };
  }

  /**
   * POST /auth/refresh — Rotate access token using refresh token
   */
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
      maxAge: 15 * 60 * 1000,
    });

    return result;
  }

  /**
   * POST /auth/logout — Clear cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: any) {
    await this.authService.logout(dto.refreshToken);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  /**
   * GET /auth/me — Get current authenticated user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  /**
   * POST /auth/users/search — Search users by display name or email
   */
  @Post('users/search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Body() dto: SearchUsersDto) {
    return this.userService.searchUsers(dto.query);
  }
}
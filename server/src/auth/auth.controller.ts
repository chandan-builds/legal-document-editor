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
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use lax or strict based on frontend exact matching
      maxAge: 15 * 60 * 1000, // 15 min
    });
    // Optional: send refresh_token in httpOnly cookie as well, but for now we follow the plan
    return {
      user: result.user,
      refresh_token: result.refresh_token,
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
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use lax or strict based on frontend exact matching
      maxAge: 15 * 60 * 1000, // 15 min
    });
    return result;
  }

  /**
   * POST /auth/logout — Revoke refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
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

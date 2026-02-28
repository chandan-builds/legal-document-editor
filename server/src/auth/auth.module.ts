import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from './user.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards';
import { WsAuthGuard } from './guards';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_EXPIRATION',
            '15m',
          ) as any,
        },
      }),
    }),
  ],
  providers: [AuthService, UserService, JwtStrategy, RolesGuard, WsAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, UserService, JwtModule, RolesGuard, WsAuthGuard],
})
export class AuthModule {}

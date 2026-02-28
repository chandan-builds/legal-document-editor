import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Guard for authenticating WebSocket connections.
 * Expects JWT token passed as query parameter: ws://server/path?token=JWT
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient();
      const request = client.upgradeReq || client._socket?._httpMessage?.req;

      if (!request) {
        this.logger.warn(
          'WebSocket auth: Could not extract request — rejecting',
        );
        return false;
      }

      const url = new URL(request.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        this.logger.warn('WebSocket connection rejected: no token');
        return false;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user to the client object for downstream use
      client.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        displayName: payload.displayName,
      };

      return true;
    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${error.message}`);
      return false;
    }
  }
}

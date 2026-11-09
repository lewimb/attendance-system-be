import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/jwt-auth.decorator.js';
import { jwtClaims } from '../../jwt-claims.js';

type AuthRequest = Request & { user?: { id: string; role: string } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.extractToken(req);

    if (!token)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Missing token',
      });

    let payload: { sub: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
        ...jwtClaims(this.configService),
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
        });
      }
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Invalid token',
      });
    }

    req.user = { id: payload.sub, role: payload.role };
    return true;
  }

  private extractToken(req: AuthRequest): string | undefined {
    const fromCookie: string | undefined = req.cookies?.['accessToken'];
    if (fromCookie) return fromCookie;

    const [type, value] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? value : undefined;
  }
}

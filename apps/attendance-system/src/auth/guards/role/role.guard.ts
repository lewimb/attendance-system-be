import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { EMPLOYEES_ROLE_KEY } from '../../../common/decorators/role.decorator.js';

type AuthRequest = Request & { user?: { id: string; role: string } };

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      EMPLOYEES_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<AuthRequest>();

    if (!user)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Missing user',
      });

    if (user.role !== required)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient role',
      });

    return true;
  }
}

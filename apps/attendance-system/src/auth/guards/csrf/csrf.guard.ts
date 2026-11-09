import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method) || req.headers['x-requested-with']) {
      return true;
    }

    throw new ForbiddenException({
      code: 'CSRF_HEADER_MISSING',
      message: 'X-Requested-With header is required',
    });
  }
}

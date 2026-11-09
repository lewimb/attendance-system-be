import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_KEY } from '../../decorators/response-message.decorator.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      response.statusMessage;

    return next.handle().pipe(
      map((data: T) =>
        data instanceof StreamableFile
          ? data
          : {
              data,
              statusCode: response.statusCode ? response.statusCode : 200,
              message: message,
            },
      ),
    );
  }
}

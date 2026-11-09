import { HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';

export function sendRpc<T>(
  client: ClientProxy,
  pattern: string,
  payload: unknown,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, payload).pipe(
      timeout(5000),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError)
          return throwError(() => new HttpException('Service timeout', 504));

        const { statusCode, code, message } = (err ?? {}) as {
          statusCode?: number;
          code?: string;
          message?: string | string[];
        };
        if (typeof statusCode === 'number' && message)
          return throwError(
            () => new HttpException({ statusCode, code, message }, statusCode),
          );

        return throwError(() => new HttpException('Service unavailable', 502));
      }),
    ),
  );
}

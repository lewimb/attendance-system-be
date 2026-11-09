import { HttpException } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { throwError } from 'rxjs';
import { sendRpc } from './send-rpc.util.js';

describe('sendRpc', () => {
  it('should keep the status, code and message of a service error', async () => {
    const client = {
      send: () =>
        throwError(() => ({
          statusCode: 409,
          code: 'ALREADY_CHECKED_IN',
          message: 'Already checked in today',
        })),
    } as unknown as ClientProxy;

    const error = await sendRpc(client, 'attendance.check_in', {}).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(409);
    expect((error as HttpException).getResponse()).toEqual({
      statusCode: 409,
      code: 'ALREADY_CHECKED_IN',
      message: 'Already checked in today',
    });
  });
});

import { HttpException } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { EMPTY, of, throwError } from 'rxjs';
import { sendRpc } from './send-rpc.util.js';

describe('sendRpc', () => {
  it('should resolve with undefined when the handler returns nothing', async () => {
    const client = { send: () => EMPTY } as unknown as ClientProxy;

    await expect(
      sendRpc(client, 'employee.update', {}),
    ).resolves.toBeUndefined();
  });

  it('should resolve with the response of the handler', async () => {
    const client = { send: () => of({ id: '1' }) } as unknown as ClientProxy;

    await expect(sendRpc(client, 'employee.find_one', {})).resolves.toEqual({
      id: '1',
    });
  });

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

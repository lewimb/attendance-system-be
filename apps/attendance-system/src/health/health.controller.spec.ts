import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { of, throwError } from 'rxjs';
import { ATTENDANCE_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const employeeClient = { send: vi.fn() };
  const attendanceClient = { send: vi.fn() };
  const db = {
    pingCheck: (key: string) => ({
      withTimeout: () => Promise.resolve({ [key]: { status: 'up' } }),
    }),
  };
  let controller: HealthController;

  beforeEach(async () => {
    employeeClient.send.mockReturnValue(of({ database: 'up' }));
    attendanceClient.send.mockReturnValue(of({ database: 'up' }));

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: EMPLOYEE_SERVICE, useValue: employeeClient },
        { provide: ATTENDANCE_SERVICE, useValue: attendanceClient },
      ],
    })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue(db)
      .compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should report ok when the database and both services are up', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.details).toMatchObject({
      database: { status: 'up' },
      employee_service: { status: 'up' },
      attendance_service: { status: 'up' },
    });
  });

  it('should throw 503 when a service is down', async () => {
    attendanceClient.send.mockReturnValue(
      throwError(() => ({ statusCode: 503, message: 'Database unavailable' })),
    );

    const error = await controller.check().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject(
      {
        status: 'error',
        error: { attendance_service: { status: 'down' } },
        info: { employee_service: { status: 'up' } },
      },
    );
  });
});

import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import {
  ATTENDANCE_SERVICE,
  EMPLOYEE_SERVICE,
  HEALTH_PATTERNS,
} from '@app/common';
import { Public } from '../common/decorators/jwt-auth.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';

const CHECK_TIMEOUT_MS = 3000;

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthIndicator: HealthIndicatorService,
    private readonly db: TypeOrmHealthIndicator,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    @Inject(ATTENDANCE_SERVICE) private readonly attendanceClient: ClientProxy,
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  @HealthCheck()
  @ResponseMessage('Healthy')
  check() {
    return this.health.check([
      () => this.db.pingCheck('database').withTimeout(CHECK_TIMEOUT_MS),
      () => this.checkService('employee_service', this.employeeClient),
      () => this.checkService('attendance_service', this.attendanceClient),
    ]);
  }

  private checkService(key: string, client: ClientProxy) {
    return this.healthIndicator
      .check(key)
      .attempt(() =>
        sendRpc<Record<string, unknown>>(client, HEALTH_PATTERNS.CHECK, {}),
      )
      .withTimeout(CHECK_TIMEOUT_MS);
  }
}

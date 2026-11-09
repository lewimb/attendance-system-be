import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { ATTENDANCE_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    TerminusModule,
    ClientsModule.registerAsync([
      {
        name: EMPLOYEE_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('EMPLOYEE_SERVICE_HOST', 'localhost'),
            port: Number(config.get('EMPLOYEE_SERVICE_PORT', 3001)),
          },
        }),
      },
      {
        name: ATTENDANCE_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('ATTENDANCE_SERVICE_HOST', 'localhost'),
            port: Number(config.get('ATTENDANCE_SERVICE_PORT', 3002)),
          },
        }),
      },
    ]),
  ],
  controllers: [HealthController],
})
export class HealthModule {}

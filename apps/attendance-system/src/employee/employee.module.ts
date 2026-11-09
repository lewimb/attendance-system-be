import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EMPLOYEE_SERVICE } from '@app/common';
import { EmployeeController } from './employee.controller.js';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [EmployeeController],
})
export class EmployeeModule {}

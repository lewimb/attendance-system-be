import { ATTENDANCE_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AttendanceController } from './attendance.controller.js';
import { PhotoStorageService } from './photo-storage.service.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
  controllers: [AttendanceController],
  providers: [PhotoStorageService],
})
export class AttendanceModule {}

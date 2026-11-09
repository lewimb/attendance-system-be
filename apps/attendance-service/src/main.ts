import { NestFactory } from '@nestjs/core';
import { AttendanceServiceModule } from './attendance-service.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AttendanceServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.ATTENDANCE_SERVICE_PORT ?? 3002),
      },
    },
  );
  await app.listen();
  console.log(
    `Attendance service is listening on TCP port ${process.env.ATTENDANCE_SERVICE_PORT ?? 3002}`,
  );
}
await bootstrap();

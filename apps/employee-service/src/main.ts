import { NestFactory } from '@nestjs/core';
import { EmployeeServiceModule } from './employee-service.module.js';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    EmployeeServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.EMPLOYEE_SERVICE_PORT ?? 3001),
      },
    },
  );
  await app.listen();
  console.log(
    `Employee service is listening on TCP port ${process.env.EMPLOYEE_SERVICE_PORT ?? 3001}`,
  );
}
await bootstrap();

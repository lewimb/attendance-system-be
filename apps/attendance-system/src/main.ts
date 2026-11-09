import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((origin) =>
      origin.trim(),
    ) ?? ['http://localhost:5173'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Gateway is listening on HTTP port ${port}`);
}
await bootstrap();

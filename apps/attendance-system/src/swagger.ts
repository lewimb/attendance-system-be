import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = [
  'Gateway API for the WFH attendance system.',
  '',
  '- Log in with `POST /auth/login` (seeded HR admin: `hr.admin@example.com` / `Password123!`). The browser keeps the `accessToken` cookie, so the other calls on this page are authenticated automatically. API clients can send the returned token with **Authorize** (Bearer) instead.',
  '- Every `POST`, `PUT`, `PATCH` and `DELETE` request needs the `X-Requested-With` header. The field is filled in on those routes.',
  '- Successful responses are wrapped in `{ data, statusCode, message }`. Errors return the status code, a message and, where the client may need to react, a `code`.',
  '- Each route allows 60 requests per minute per client, and login and refresh allow 10. `/health` is not limited.',
].join('\n');

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('WFH Attendance API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, config),
    { swaggerOptions: { persistAuthorization: true } },
  );
}

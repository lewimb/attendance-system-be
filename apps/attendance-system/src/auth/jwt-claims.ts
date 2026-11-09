import type { ConfigService } from '@nestjs/config';

export function jwtClaims(config: ConfigService) {
  return {
    issuer: config.get<string>('JWT_ISSUER', 'attendance-app'),
    audience: config.get<string>('JWT_AUDIENCE', 'attendance-web'),
  };
}

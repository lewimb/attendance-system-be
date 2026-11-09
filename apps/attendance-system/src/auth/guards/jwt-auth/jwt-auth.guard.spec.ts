import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    expect(
      new JwtAuthGuard(new JwtService(), new ConfigService(), new Reflector()),
    ).toBeDefined();
  });
});

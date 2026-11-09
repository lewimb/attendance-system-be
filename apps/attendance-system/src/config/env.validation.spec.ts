import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const valid = {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'r'.repeat(32),
  };

  it('should accept secrets of at least 32 characters', () => {
    expect(validateEnv(valid)).toBe(valid);
  });

  it('should refuse a missing secret', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_SECRET: undefined }),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('should refuse a short secret', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_REFRESH_SECRET: 'short' }),
    ).toThrow('JWT_REFRESH_SECRET');
  });
});

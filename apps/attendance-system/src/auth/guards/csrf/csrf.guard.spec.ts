import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

const contextFor = (method: string, headers: Record<string, string> = {}) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  }) as unknown as ExecutionContext;

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('should allow safe methods without the header', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
  });

  it('should reject a write request without X-Requested-With', () => {
    expect(() => guard.canActivate(contextFor('POST'))).toThrow(
      ForbiddenException,
    );
  });

  it('should allow a write request with X-Requested-With', () => {
    expect(
      guard.canActivate(
        contextFor('PATCH', { 'x-requested-with': 'XMLHttpRequest' }),
      ),
    ).toBe(true);
  });
});

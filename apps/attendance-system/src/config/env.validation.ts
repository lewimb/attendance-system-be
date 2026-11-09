const REQUIRED_SECRETS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
const MIN_SECRET_LENGTH = 32;

export function validateEnv(config: Record<string, unknown>) {
  for (const key of REQUIRED_SECRETS) {
    const value = config[key];
    if (typeof value !== 'string' || value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${key} must be set and at least ${MIN_SECRET_LENGTH} characters long`,
      );
    }
  }

  return config;
}

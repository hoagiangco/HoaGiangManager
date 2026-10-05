function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getLoginSecurityConfig() {
  return {
    maxFailedAttempts: readPositiveInteger(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 5),
    lockoutMinutes: readPositiveInteger(process.env.LOGIN_LOCKOUT_MINUTES, 15),
  };
}

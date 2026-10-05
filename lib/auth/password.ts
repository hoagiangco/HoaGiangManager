export function getDefaultStaffPassword(): string {
  const password = process.env.DEFAULT_STAFF_PASSWORD;

  if (!password) {
    throw new Error('DEFAULT_STAFF_PASSWORD must be configured before creating a staff account');
  }

  return password;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
}

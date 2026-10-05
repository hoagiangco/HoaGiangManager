import jwt from 'jsonwebtoken';

const configuredSecret = process.env.JWT_SECRET?.trim();
const insecureSecrets = new Set([
  'your-secret-key-change-this-in-production',
  'your-secret-key-change-this-min-32-characters',
  'change-this-secret-key-min-32-characters',
  'changeme',
]);

if (!configuredSecret || configuredSecret.length < 32 || insecureSecrets.has(configuredSecret)) {
  throw new Error('JWT_SECRET must be configured with a non-placeholder value of at least 32 characters');
}

const JWT_SECRET = configuredSecret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  mustChangePassword?: boolean;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};


import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = ['JWT_SECRET', 'OTP_TOKEN_SECRET', 'ADMIN_JWT_SECRET'];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

const integer = (key, fallback) => {
  const value = Number.parseInt(process.env[key], 10);
  return Number.isFinite(value) ? value : fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: integer('PORT', 3113),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  appUrl: (process.env.APP_URL || 'http://localhost:3113').replace(/\/$/, ''),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: integer('DB_PORT', 3306),
    name: process.env.DB_NAME || 'outdrive',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-change-this-jwt-secret-before-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    otpSecret: process.env.OTP_TOKEN_SECRET || 'development-only-change-this-otp-secret-before-production',
    otpExpiresIn: process.env.OTP_TOKEN_EXPIRES_IN || '10m'
  },
  adminAuth: {
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'development-only-change-this-admin-jwt-secret-before-production',
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
    challengeExpiresIn: process.env.ADMIN_LOGIN_CHALLENGE_EXPIRES_IN || '5m',
    otpExpirySeconds: integer('ADMIN_OTP_EXPIRY_SECONDS', 300),
    otpMaxAttempts: integer('ADMIN_OTP_MAX_ATTEMPTS', 5),
    fixedOtp: process.env.NODE_ENV === 'production' ? '' : (process.env.ADMIN_DEV_OTP || '123456')
  },
  payments: {
    // Stays off until a payment gateway is integrated, so the app never offers "online".
    onlineEnabled: process.env.ONLINE_PAYMENT_ENABLED === 'true'
  },
  otp: {
    expirySeconds: integer('OTP_EXPIRY_SECONDS', 300),
    resendSeconds: integer('OTP_RESEND_SECONDS', 30),
    maxAttempts: integer('OTP_MAX_ATTEMPTS', 5),
    dailyCap: integer('OTP_DAILY_CAP', 10),
    fixedValue: process.env.NODE_ENV === 'production' ? '' : (process.env.DEV_FIXED_OTP || '123456')
  }
});

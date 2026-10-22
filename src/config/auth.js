import { env } from './env.js';

export const accessTokenOptions = {
  expiresIn: env.jwt.expiresIn,
  issuer: 'outdrive-api',
  audience: 'outdrive-mobile'
};

export const otpTokenOptions = {
  expiresIn: env.jwt.otpExpiresIn,
  issuer: 'outdrive-api',
  audience: 'outdrive-otp'
};

export const adminTokenOptions = {
  expiresIn: env.adminAuth.expiresIn,
  issuer: 'outdrive-api',
  audience: 'outdrive-admin'
};

export const adminChallengeTokenOptions = {
  expiresIn: env.adminAuth.challengeExpiresIn,
  issuer: 'outdrive-api',
  audience: 'outdrive-admin-challenge'
};

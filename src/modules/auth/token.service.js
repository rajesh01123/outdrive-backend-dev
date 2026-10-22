import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { accessTokenOptions, otpTokenOptions } from '../../config/auth.js';
import { env } from '../../config/env.js';
import { UserSession } from '../../database/models/index.js';
import { bindDevice } from './auth.repository.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const issueUserSession = async ({ user, deviceToken, loginBy, transaction }) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: String(user.id), jti, type: 'user' },
    env.jwt.secret,
    accessTokenOptions
  );
  const decoded = jwt.decode(token);
  await UserSession.create(
    {
      userId: user.id,
      deviceToken,
      loginBy,
      tokenJti: jti,
      tokenHash: hash(token),
      expiresAt: new Date(decoded.exp * 1000)
    },
    { transaction }
  );
  await bindDevice({ userId: user.id, deviceToken, platform: loginBy, transaction });
  return token;
};

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.secret, accessTokenOptions);

export const issueOtpProof = ({ mobile, countryCode }) =>
  jwt.sign({ mobile, country_code: countryCode, type: 'otp_proof' }, env.jwt.otpSecret, otpTokenOptions);

import { Op } from 'sequelize';
import { User, UserSession } from '../database/models/index.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { AppError } from '../shared/utils/app-error.js';
import { asyncHandler } from '../shared/utils/async-handler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('unauthorized', 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('invalid_or_expired_token', 401);
  }
  if (payload.type !== 'user' || !payload.sub || !payload.jti) throw new AppError('invalid_token', 401);

  const session = await UserSession.findOne({
    where: { tokenJti: payload.jti, revokedAt: null, expiresAt: { [Op.gt]: new Date() } }
  });
  if (!session) throw new AppError('session_revoked', 401);

  const user = await User.findByPk(payload.sub);
  if (!user || user.status === 'deleted') throw new AppError('session_revoked', 401);
  if (user.status === 'blocked') throw new AppError('user_blocked', 403);

  req.auth = { userId: user.id, sessionId: session.id, jti: payload.jti };
  req.user = user;
  next();
});

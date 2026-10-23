import { authenticate } from './authenticate.js';

// For "Bearer preferred" APIs: no token is fine, but a token that is sent must be valid,
// so the app learns about an expired session instead of silently acting logged out.
export const optionalAuthenticate = (req, res, next) => (req.get('authorization') ? authenticate(req, res, next) : next());

import { runWithRequest } from './request-context.js';

// Each handler runs inside the request context, so services can tell who is acting (used by the audit log).
export const asyncHandler = (handler) => (req, res, next) =>
  runWithRequest(req, () => Promise.resolve(handler(req, res, next)).catch(next));

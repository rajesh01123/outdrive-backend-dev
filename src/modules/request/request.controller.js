import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as requestService from './request.service.js';

// ETA-01 keeps enabled_dispatch_type beside data (app contract), so it builds the envelope itself.
export const eta = asyncHandler(async (req, res) => {
  const { message, enabledDispatchType, data } = await requestService.estimate({ body: req.body, user: req.user });
  return res.status(200).json({ success: true, message, enabled_dispatch_type: enabledDispatchType, data });
});

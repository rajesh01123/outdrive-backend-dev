import { AsyncLocalStorage } from 'node:async_hooks';

// Keeps the current Express request reachable from services (audit logs read who is acting and from where)
// without passing `req` through every function. asyncHandler opens the context around each handler.
const storage = new AsyncLocalStorage();

export const runWithRequest = (req, callback) => storage.run({ req }, callback);

/** The request being handled, or null outside a request (seeders, scripts, timers). */
export const currentRequest = () => storage.getStore()?.req || null;

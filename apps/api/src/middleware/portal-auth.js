import supabaseAdmin from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';

const sendAuthError = (res, status, code, message) => res.status(status).json({ code, message });

// Never log the error object, message, stack, request headers or credentials.
const logAuthFailure = (reason, error) => {
  const code = error?.code;
  const status = error?.status;
  logger.warn('[portal-auth] Session verification failed', {
    reason,
    supabase_code: typeof code === 'string' && /^[a-z][a-z_]{0,63}$/.test(code) ? code : null,
    supabase_status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null
  });
};

export const createRequireAuthenticatedUser = (authClient = supabaseAdmin) => async (req, res, next) => {
  const authorization = String(req.get('authorization') || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return sendAuthError(res, 401, 'PORTAL_AUTH_REQUIRED', 'A valid portal session is required.');
  }

  try {
    const { data, error } = await authClient.auth.getUser(match[1]);
    const user = data?.user;

    if (error || !user) {
      logAuthFailure(error ? 'supabase_rejected' : 'user_missing', error);
      return sendAuthError(res, 401, 'PORTAL_AUTH_INVALID', 'The portal session is invalid or expired.');
    }

    req.authenticatedUser = {
      id: user.id,
      email: user.email,
      appMetadata: user.app_metadata || {}
    };
    return next();
  } catch (error) {
    logAuthFailure('verification_exception', error);
    return sendAuthError(res, 401, 'PORTAL_AUTH_INVALID', 'The portal session could not be verified.');
  }
};

export const createRequirePortalUser = (authClient = supabaseAdmin) => {
  const requireAuthenticatedUser = createRequireAuthenticatedUser(authClient);

  return async (req, res, next) => requireAuthenticatedUser(req, res, () => {
    const clientId = String(req.authenticatedUser?.appMetadata?.client_id || '').trim();
    if (!clientId) {
      return sendAuthError(res, 403, 'PORTAL_CLIENT_NOT_ASSIGNED', 'The portal account is not assigned to a client.');
    }

    req.portalUser = {
      id: req.authenticatedUser.id,
      email: req.authenticatedUser.email,
      clientId
    };
    return next();
  });
};

export const requireAuthenticatedUser = createRequireAuthenticatedUser();
export const requirePortalUser = createRequirePortalUser();

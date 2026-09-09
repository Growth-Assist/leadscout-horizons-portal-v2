import supabaseAdmin from '../utils/supabaseAdmin.js';

const sendAuthError = (res, status, code, message) => res.status(status).json({ code, message });

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
      return sendAuthError(res, 401, 'PORTAL_AUTH_INVALID', 'The portal session is invalid or expired.');
    }

    req.authenticatedUser = {
      id: user.id,
      email: user.email,
      appMetadata: user.app_metadata || {}
    };
    return next();
  } catch {
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

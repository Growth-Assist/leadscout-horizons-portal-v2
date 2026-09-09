import express from 'express';
import supabaseAdmin from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { requireAuthenticatedUser, requirePortalUser } from '../middleware/portal-auth.js';
import {
  getPortalQualificationStatus,
  PortalQualifierError,
  startPortalQualification
} from '../services/portal-qualifier.js';

const router = express.Router();

const sendQualifierError = (res, error) => {
  if (error instanceof PortalQualifierError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }

  logger.error('[Quick Qualify] Unexpected proxy error: ' + error.message);
  return res.status(500).json({
    code: 'QUALIFIER_PROXY_ERROR',
    message: 'Quick Qualify could not be completed.'
  });
};

router.post('/quick-qualify/runs', requirePortalUser, async (req, res) => {
  try {
    const result = await startPortalQualification(
      req.portalUser.clientId,
      req.body
    );
    const transactionId = String(result.payload?.transaction_id || '').trim();
    if (result.status === 202 && !transactionId) {
      throw new PortalQualifierError(
        'QUALIFIER_UPSTREAM_INVALID_RESPONSE',
        'The Quick Qualify service did not return a qualification job identifier.',
        502
      );
    }
    const payload = result.status === 202 && transactionId
      ? {
          ...result.payload,
          status_url: `/api/portal/quick-qualify/runs/${encodeURIComponent(transactionId)}`
        }
      : result.payload;

    return res.status(result.status).json(payload);
  } catch (error) {
    return sendQualifierError(res, error);
  }
});

router.get('/quick-qualify/runs/:transactionId', requirePortalUser, async (req, res) => {
  try {
    const result = await getPortalQualificationStatus(
      req.portalUser.clientId,
      req.params.transactionId
    );
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return sendQualifierError(res, error);
  }
});

router.post('/bootstrap-user', requireAuthenticatedUser, async (req, res) => {
  logger.info('[API] POST /api/portal/bootstrap-user received');
  const { id: userId } = req.authenticatedUser;

  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Authenticated user is required.' });
    }

    logger.info(`[API] Bootstrapping authenticated user ${userId}`);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      throw new Error(`Failed to fetch user: ${userError?.message || 'User not found'}`);
    }

    const user = userData.user;
    const email = String(user.email || '').trim();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Authenticated user email is required.' });
    }

    const appMetadata = user.app_metadata || {};

    if (appMetadata.portal_role === 'admin') {
      const response = { success: true, portal_role: 'admin' };
      return res.json(response);
    }

    if (appMetadata.client_id) {
      const response = {
        success: true,
        client_id: appMetadata.client_id,
        portal_role: appMetadata.portal_role || 'viewer',
      };
      return res.json(response);
    }

    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      throw new Error('Invalid email format');
    }
    const domain = emailParts[1].toLowerCase();

    const { data: assignments, error: queryError } = await supabaseAdmin
      .from('portal_email_domain_assignments')
      .select('client_id')
      .eq('email_domain', domain)
      .eq('is_active', true)
      .eq('is_verified', true);

    if (queryError) {
      throw new Error(`Failed to query domain assignments: ${queryError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      throw new Error('No domain assignment found');
    }

    if (assignments.length > 1) {
      throw new Error('Multiple domain assignments found');
    }

    const clientId = assignments[0].client_id;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...appMetadata,
        client_id: clientId,
        portal_role: 'viewer',
        mfa_required: true,
      },
    });

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    logger.info(`User ${userId} bootstrapped with client_id: ${clientId}`);

    const response = {
      success: true,
      client_id: clientId,
      portal_role: 'viewer',
    };
    
    res.json(response);

  } catch (error) {
    logger.error('[API] Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Unable to bootstrap the portal account.' });
  }
});

export default router;

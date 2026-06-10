import express from 'express';
import supabaseAdmin from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/bootstrap-user', async (req, res) => {
  logger.info('[API] POST /api/portal/bootstrap-user received');
  logger.info('[API] Request body: ' + JSON.stringify(req.body));

  const { userId, email, client_id: reqClientId } = req.body;
  logger.info('[API] client_id: ' + reqClientId);

  if (!userId || !email) {
    const errResponse = { error: 'userId and email are required' };
    logger.info('[API] Sending response: ' + JSON.stringify(errResponse));
    return res.status(400).json(errResponse);
  }

  try {
    logger.info('[API] Fetching/creating user record');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      throw new Error(`Failed to fetch user: ${userError?.message || 'User not found'}`);
    }

    const user = userData.user;
    logger.info('[API] User record: ' + JSON.stringify(user));

    const appMetadata = user.app_metadata || {};

    if (appMetadata.portal_role === 'admin') {
      const response = { success: true, portal_role: 'admin' };
      logger.info('[API] Sending response: ' + JSON.stringify(response));
      return res.json(response);
    }

    if (appMetadata.client_id) {
      const response = {
        success: true,
        client_id: appMetadata.client_id,
        portal_role: appMetadata.portal_role || 'viewer',
      };
      logger.info('[API] Sending response: ' + JSON.stringify(response));
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
    
    logger.info('[API] Sending response: ' + JSON.stringify(response));
    res.json(response);

  } catch (error) {
    logger.error('[API] Error: ' + error.message);
    const errResponse = { success: false, error: error.message };
    logger.info('[API] Sending response: ' + JSON.stringify(errResponse));
    res.status(500).json(errResponse);
  }
});

export default router;
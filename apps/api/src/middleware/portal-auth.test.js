import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequireAuthenticatedUser, createRequirePortalUser } from './portal-auth.js';

const createResponse = () => ({
  statusCode: null,
  payload: null,
  status(value) {
    this.statusCode = value;
    return this;
  },
  json(value) {
    this.payload = value;
    return this;
  }
});

describe('portal authentication middleware', () => {
  it('authenticates a verified user before client metadata has been assigned', async () => {
    const middleware = createRequireAuthenticatedUser({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: 'user-1',
              email: 'person@ultraict.com',
              app_metadata: {}
            }
          },
          error: null
        })
      }
    });
    const request = { get: () => 'Bearer valid-token' };
    const response = createResponse();
    let nextCalled = false;

    await middleware(request, response, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(request.authenticatedUser, {
      id: 'user-1',
      email: 'person@ultraict.com',
      appMetadata: {}
    });
  });

  it('rejects a request without a bearer token', async () => {
    const middleware = createRequirePortalUser({ auth: { getUser: async () => assert.fail() } });
    const response = createResponse();

    await middleware({ get: () => '' }, response, () => assert.fail());

    assert.equal(response.statusCode, 401);
    assert.equal(response.payload.code, 'PORTAL_AUTH_REQUIRED');
  });

  it('derives client identity from verified app_metadata', async () => {
    const middleware = createRequirePortalUser({
      auth: {
        getUser: async (token) => {
          assert.equal(token, 'valid-token');
          return {
            data: {
              user: {
                id: 'user-1',
                email: 'person@ultraict.com',
                app_metadata: { client_id: 'ultraict' }
              }
            },
            error: null
          };
        }
      }
    });
    const request = { get: () => 'Bearer valid-token' };
    const response = createResponse();
    let nextCalled = false;

    await middleware(request, response, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(request.portalUser, {
      id: 'user-1',
      email: 'person@ultraict.com',
      clientId: 'ultraict'
    });
  });

  it('rejects a verified user without a client assignment', async () => {
    const middleware = createRequirePortalUser({
      auth: { getUser: async () => ({ data: { user: { app_metadata: {} } }, error: null }) }
    });
    const response = createResponse();

    await middleware({ get: () => 'Bearer valid-token' }, response, () => assert.fail());

    assert.equal(response.statusCode, 403);
    assert.equal(response.payload.code, 'PORTAL_CLIENT_NOT_ASSIGNED');
  });
});

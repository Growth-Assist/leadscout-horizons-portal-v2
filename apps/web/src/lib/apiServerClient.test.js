import { describe, expect, it } from 'vitest';
import { resolveApiServerUrl } from './apiServerClient.js';

describe('apiServerClient routing', () => {
  it.each(['localhost', '127.0.0.1', '::1'])(
    'uses the local Express API for %s',
    (hostname) => {
      expect(resolveApiServerUrl({ hostname, configuredUrl: '' }))
        .toBe('/portal-api');
    }
  );

  it('uses the same-origin portal API mount outside local development', () => {
    expect(resolveApiServerUrl({ hostname: 'preview.growth-assist.co.uk', configuredUrl: '' }))
      .toBe('/portal-api');
  });

  it('allows an explicit API base override and removes trailing slashes', () => {
    expect(resolveApiServerUrl({
      hostname: 'localhost',
      configuredUrl: 'https://portal-api.example.com///'
    })).toBe('https://portal-api.example.com');
  });
});

export const resolveApiServerUrl = ({
    configuredUrl = import.meta.env.VITE_PORTAL_API_BASE_URL
} = {}) => {
    const configured = String(configuredUrl || '').trim();
    const candidate = configured || '/portal-api';

    if (!candidate.startsWith('/')) {
        const parsed = new URL(candidate);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('VITE_PORTAL_API_BASE_URL must be an HTTP(S) URL or root-relative path.');
        }
    }

    return candidate.replace(/\/+$/, '');
};

export const API_SERVER_URL = resolveApiServerUrl();

const apiServerClient = {
    fetch: async (url, options = {}) => {
        return await window.fetch(API_SERVER_URL + url, options);
    }
};

export default apiServerClient;

export { apiServerClient };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const isLocalHost =
  typeof window !== 'undefined' && LOCAL_HOSTS.has(window.location.hostname);

const PROD_WIII_APP_URL = 'https://wiii.holilihu.online';
const LOCAL_WIII_APP_URL = 'http://localhost:1420';

export const environment = {
  production: true,
  apiUrl: '',  // Same-origin: Caddy proxies both FE and /api/* on holilihu.online
  // Docker/local builds still use the production Angular configuration, so
  // detect localhost at runtime and switch the Wiii surface back to the local stack.
  wiiiEmbedUrl: isLocalHost ? 'http://localhost:8000/embed' : `${PROD_WIII_APP_URL}/embed`,
  wiiiAppUrl: isLocalHost ? LOCAL_WIII_APP_URL : PROD_WIII_APP_URL,
};

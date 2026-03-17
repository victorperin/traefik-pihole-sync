// Jest setup file - runs before any tests
// Set required environment variables before any modules are loaded

process.env.REVERSE_PROXY_IPS = process.env.REVERSE_PROXY_IPS || '192.168.1.1';
process.env.PIHOLE_PASSWORD = process.env.PIHOLE_PASSWORD || 'testpassword';
process.env.TRAEFIK_API_URL = process.env.TRAEFIK_API_URL || 'http://traefik:8080';
process.env.PIHOLE_URL = process.env.PIHOLE_URL || 'http://pihole:80';
process.env.SYNC_INTERVAL = process.env.SYNC_INTERVAL || '60000';
process.env.DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN || 'local';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';

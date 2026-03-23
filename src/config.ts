export interface Config {
  traefikApiUrl: string;
  piholeUrl: string;
  piholePassword: string;
  syncInterval: number;
  logLevel: string;
  reverseProxyIps: string[];
}

export function getConfig(): Config {
  const reverseProxyIpsEnv = process.env.REVERSE_PROXY_IPS || '';
  const reverseProxyIps = reverseProxyIpsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);

  if (reverseProxyIps.length === 0) {
    throw new Error('REVERSE_PROXY_IPS environment variable is required (comma-separated IPs)');
  }

  return {
    traefikApiUrl: process.env.TRAEFIK_API_URL || 'http://traefik:8080',
    piholeUrl: process.env.PIHOLE_URL || 'http://pihole:80',
    piholePassword: process.env.PIHOLE_PASSWORD || '',
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '60000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    reverseProxyIps,
  };
}

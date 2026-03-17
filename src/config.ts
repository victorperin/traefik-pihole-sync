export interface Config {
  traefikApiUrl: string;
  piholeUrl: string;
  piholePassword: string;
  syncInterval: number;
  defaultDomain: string;
}

export function getConfig(): Config {
  return {
    traefikApiUrl: process.env.TRAEFIK_API_URL || 'http://traefik:8080',
    piholeUrl: process.env.PIHOLE_URL || 'http://pihole:80',
    piholePassword: process.env.PIHOLE_PASSWORD || '',
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '60000', 10),
    defaultDomain: process.env.DEFAULT_DOMAIN || 'local',
  };
}

import dotenv from 'dotenv';
import { TraefikService } from './services/traefik';
import { PiHoleService } from './services/pihole';

dotenv.config();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function main() {
  console.log('[INFO] Starting Traefik to Pi-hole DNS Sync...');

  const traefikUrl = process.env.TRAEFIK_API_URL || 'http://traefik:8080';
  const piholeUrl = process.env.PIHOLE_URL || 'http://pihole:80';
  const piholePassword = process.env.PIHOLE_PASSWORD || '';
  const syncInterval = parseInt(process.env.SYNC_INTERVAL || '60000', 10);

  const traefikService = new TraefikService(traefikUrl);
  const piholeService = new PiHoleService(piholeUrl, piholePassword);

  async function sync() {
    try {
      console.log('[INFO] Fetching services from Traefik...');
      const services = await traefikService.getServices();
      
      console.log(`[INFO] Found ${services.length} service(s) in Traefik`);

      for (const service of services) {
        const domain = `${service.name}.${service.domain || 'local'}`;
        
        // DEBUG: Log domain details for diagnosis
        console.log(`[DEBUG] Processing domain: "${domain}", name: "${service.name}", ip: "${service.ip}"`);
        
        // Check for internal/local domains that should be skipped
        const isLocalDomain = (service.domain || 'local') === 'local';
        const hasSwarmPrefix = service.name.includes('@');
        
        console.log(`[DEBUG] isLocalDomain: ${isLocalDomain}, hasSwarmPrefix: ${hasSwarmPrefix}`);
        
        // Skip internal Docker/Traefik routes (.local domains and @ prefixed names)
        if (isLocalDomain || hasSwarmPrefix) {
          console.log(`[INFO] Skipping internal/local domain: ${domain}`);
          continue;
        }
        
        console.log(`[INFO] Syncing: ${domain} -> ${service.ip || '127.0.0.1'}`);
        await piholeService.addDnsRecord(domain, service.ip || '127.0.0.1');
      }

      console.log('[INFO] Sync completed successfully');
    } catch (error) {
      console.error('[ERROR] Sync failed:', getErrorMessage(error));
    }
  }

  // Initial sync
  await sync();

  // Periodic sync
  setInterval(sync, syncInterval);
}

main().catch(console.error);

import dotenv from 'dotenv';
import { TraefikService } from './services/traefik';
import { PiHoleService } from './services/pihole';

dotenv.config();

async function main() {
  console.log('Starting Traefik to Pi-hole DNS Sync...');

  const traefikUrl = process.env.TRAEFIK_API_URL || 'http://traefik:8080';
  const piholeUrl = process.env.PIHOLE_URL || 'http://pihole:80';
  const piholePassword = process.env.PIHOLE_PASSWORD || '';
  const syncInterval = parseInt(process.env.SYNC_INTERVAL || '60000', 10);

  const traefikService = new TraefikService(traefikUrl);
  const piholeService = new PiHoleService(piholeUrl, piholePassword);

  async function sync() {
    try {
      console.log('Fetching services from Traefik...');
      const services = await traefikService.getServices();
      
      console.log(`Found ${services.length} services in Traefik`);

      for (const service of services) {
        const domain = `${service.name}.${service.domain || 'local'}`;
        
        console.log(`Creating DNS record for: ${domain}`);
        await piholeService.addDnsRecord(domain, service.ip || 'xxx.xxx.xxx.xxx');
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during sync:', error);
    }
  }

  // Initial sync
  await sync();

  // Periodic sync
  setInterval(sync, syncInterval);
}

main().catch(console.error);

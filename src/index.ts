import dotenv from 'dotenv';
dotenv.config();

import { logger } from './logger';
import { TraefikService } from './services/traefik';
import { PiHoleService } from './services/pihole';

interface SyncResult {
  domain: string;
  ip: string;
  status: 'synced' | 'skipped';
  reason?: string;
}

async function main() {
  logger.info('Starting Traefik to Pi-hole DNS Sync...');

  const traefikUrl = process.env.TRAEFIK_API_URL || 'http://traefik:8080';
  const piholeUrl = process.env.PIHOLE_URL || 'http://pihole:80';
  const piholePassword = process.env.PIHOLE_PASSWORD || '';
  const syncInterval = parseInt(process.env.SYNC_INTERVAL || '60000', 10);

  const traefikService = new TraefikService(traefikUrl);
  const piholeService = new PiHoleService(piholeUrl, piholePassword);

  async function sync() {
    const results: SyncResult[] = [];

    try {
      logger.info('Fetching services from Traefik...');
      const services = await traefikService.getServices();
      
      logger.info(`Found ${services.length} service(s) in Traefik`);

      for (const service of services) {
        const domain = `${service.name}.${service.domain || 'local'}`;
        const ip = service.ip || 'xxx.xxx.xxx.xxx';
        
        logger.debug(`Processing domain: "${domain}", name: "${service.name}", ip: "${ip}"`);
        
        // Check for internal/local domains that should be skipped
        const isLocalDomain = (service.domain || 'local') === 'local';
        const hasSwarmPrefix = service.name.includes('@');
        
        logger.debug(`isLocalDomain: ${isLocalDomain}, hasSwarmPrefix: ${hasSwarmPrefix}`);
        
        // Skip internal Docker/Traefik routes (.local domains and @ prefixed names)
        if (isLocalDomain || hasSwarmPrefix) {
          logger.debug(`Skipping internal/local domain: ${domain}`);
          results.push({ domain, ip, status: 'skipped', reason: 'internal/local domain' });
          continue;
        }
        
        logger.info(`Syncing: ${domain} -> ${ip}`);
        await piholeService.addDnsRecord(domain, ip);
        results.push({ domain, ip, status: 'synced' });
      }

      // Log summary
      logger.info('--- Sync Results ---');
      for (const result of results) {
        if (result.status === 'synced') {
          logger.info(`  ✓ ${result.domain} -> ${result.ip}`);
        } else {
          logger.debug(`  - ${result.domain} (skipped: ${result.reason})`);
        }
      }
      
      const syncedCount = results.filter(r => r.status === 'synced').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      logger.info(`Synced: ${syncedCount}, Skipped: ${skippedCount}, Total: ${results.length}`);

    } catch (error) {
      logger.error({ err: error }, 'Sync failed');
    }
  }

  // Initial sync
  await sync();

  // Periodic sync
  setInterval(sync, syncInterval);
}

main().catch(logger.error);

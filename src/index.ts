import dotenv from 'dotenv';
dotenv.config();

import { logger } from './logger';
import { getConfig } from './config';
import { TraefikService } from './services/traefik';
import { PiHoleService, DnsRecord, generateDiff } from './services/pihole';

interface SyncResult {
  domain: string;
  ip: string;
  status: 'synced' | 'skipped' | 'removed' | 'changed' | 'added';
  reason?: string;
}

async function main() {
  logger.info('Starting Traefik to Pi-hole DNS Sync...');

  const config = getConfig();
  const { traefikApiUrl, piholeUrl, piholePassword, syncInterval, reverseProxyIps } = config;

  const traefikService = new TraefikService(traefikApiUrl);
  const piholeService = new PiHoleService(piholeUrl, piholePassword);

  /**
   * Builds the desired DNS records list from Traefik routers
   */
  function buildDesiredRecords(routers: ReturnType<TraefikService['getRouters']> extends Promise<infer R> ? R : never): DnsRecord[] {
    const desired: DnsRecord[] = [];

    for (const router of routers) {
      for (const host of router.hosts) {
        // Skip if the host looks like an IP address (no domain)
        const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(host);
        if (isIpAddress) {
          continue;
        }

        // Skip regex patterns (e.g., ^.+$ or regex expressions)
        const isRegex = /^\^.*\$/.test(host) || /[?+*]/.test(host);
        if (isRegex) {
          logger.debug(`Skipping regex pattern: ${host}`);
          continue;
        }

        // Skip internal/localhost domains
        const isLocalhost = host === 'localhost' || host.includes('.local') || host.endsWith('.internal');
        if (isLocalhost) {
          continue;
        }

        // Create a DNS record for each reverse proxy IP
        for (const reverseProxyIp of reverseProxyIps) {
          desired.push({ domain: host, ip: reverseProxyIp });
        }
      }
    }

    return desired;
  }

  async function sync() {
    const results: SyncResult[] = [];

    try {
      logger.info('Fetching routers from Traefik...');
      const routers = await traefikService.getRouters();

      logger.info(`Found ${routers.length} router(s) with Host rules`);

      // Build desired records from Traefik routers
      const desiredRecords = buildDesiredRecords(routers);
      logger.debug({ count: desiredRecords.length }, 'Desired DNS records from Traefik');

      // Get current DNS records from Pi-hole
      logger.info('Fetching current DNS records from Pi-hole...');
      const currentRecords = await piholeService.getAllDnsRecords();
      logger.debug({ count: currentRecords.length }, 'Current DNS records in Pi-hole');

      // Generate diff
      const diff = generateDiff(currentRecords, desiredRecords);
      logger.info(`DNS Diff: ${diff.toAdd.length} to add, ${diff.toRemove.length} to remove, ${diff.toChange.length} to change`);

      // Execute changes in order: remove, change, add

      // 1. Remove old records
      for (const record of diff.toRemove) {
        logger.info(`Removing: ${record.domain} -> ${record.ip}`);
        await piholeService.removeDnsRecord(record.domain, record.ip);
        results.push({ domain: record.domain, ip: record.ip, status: 'removed' });
      }

      // 2. Change (update) existing records - remove old and add new
      for (const record of diff.toChange) {
        // Find the old IP for this domain
        const oldRecord = currentRecords.find(r => r.domain === record.domain);
        if (oldRecord) {
          logger.info(`Changing: ${record.domain} from ${oldRecord.ip} to ${record.ip}`);
          await piholeService.removeDnsRecord(record.domain, oldRecord.ip);
        }
        await piholeService.addDnsRecord(record.domain, record.ip);
        results.push({ domain: record.domain, ip: record.ip, status: 'changed' });
      }

      // 3. Add new records
      for (const record of diff.toAdd) {
        logger.info(`Adding: ${record.domain} -> ${record.ip}`);
        await piholeService.addDnsRecord(record.domain, record.ip);
        results.push({ domain: record.domain, ip: record.ip, status: 'added' });
      }

      // Log summary
      logger.info('--- Sync Results ---');
      for (const result of results) {
        const statusIcon = result.status === 'added' ? '+' : result.status === 'removed' ? '-' : result.status === 'changed' ? '~' : '?';
        logger.info(`  ${statusIcon} ${result.domain} -> ${result.ip} (${result.status})`);
      }

      const addedCount = results.filter(r => r.status === 'added').length;
      const removedCount = results.filter(r => r.status === 'removed').length;
      const changedCount = results.filter(r => r.status === 'changed').length;
      logger.info(`Summary: Added: ${addedCount}, Removed: ${removedCount}, Changed: ${changedCount}, Total: ${results.length}`);

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

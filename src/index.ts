import dotenv from 'dotenv';
dotenv.config();

import { logger } from './logger';
import { getConfig } from './config';
import { TraefikService } from './services/traefik';
import { PiHoleService, DnsRecord, generateDiff } from './services/pihole';

async function main() {
  logger.info('Starting Traefik to Pi-hole DNS Sync...');

  const config = getConfig();
  const { traefikApiUrl, piholeUrl, piholePassword, syncInterval, reverseProxyIps } = config;

  const traefikService = new TraefikService(traefikApiUrl);
  const piholeService = new PiHoleService(piholeUrl, piholePassword);

  function isValidHost(host: string): boolean {
    // Skip IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    // Skip regex patterns
    if (/^\^.*\$/.test(host) || /[?+*]/.test(host)) return false;
    // Skip internal/localhost domains
    if (host === 'localhost' || host.includes('.local') || host.endsWith('.internal')) return false;
    return true;
  }

  function buildDesiredRecords(routers: { hosts: string[] }[]): DnsRecord[] {
    const desired: DnsRecord[] = [];
    for (const router of routers) {
      for (const host of router.hosts) {
        if (!isValidHost(host)) continue;
        for (const ip of reverseProxyIps) {
          desired.push({ domain: host, ip });
        }
      }
    }
    return desired;
  }

  async function sync() {
    try {
      const routers = await traefikService.getRouters();
      logger.info(`Found ${routers.length} router(s) with Host rules`);

      const desiredRecords = buildDesiredRecords(routers);
      const currentRecords = await piholeService.getAllDnsRecords();

      const diff = generateDiff(currentRecords, desiredRecords);
      logger.info(`DNS Diff: ${diff.toAdd.length} to add, ${diff.toRemove.length} to remove, ${diff.toChange.length} to change`);

      // Apply changes in order: remove, change, add
      for (const record of diff.toRemove) {
        logger.info(`Removing: ${record.domain} -> ${record.ip}`);
        await piholeService.removeDnsRecord(record.domain, record.ip);
      }

      for (const record of diff.toChange) {
        const oldRecord = currentRecords.find(r => r.domain === record.domain);
        if (oldRecord) {
          logger.info(`Changing: ${record.domain} from ${oldRecord.ip} to ${record.ip}`);
          await piholeService.removeDnsRecord(record.domain, oldRecord.ip);
        }
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      for (const record of diff.toAdd) {
        logger.info(`Adding: ${record.domain} -> ${record.ip}`);
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      logger.info(`Sync complete: Added ${diff.toAdd.length}, Removed ${diff.toRemove.length}, Changed ${diff.toChange.length}`);
    } catch (error) {
      logger.error({ err: error }, 'Sync failed');
    }
  }

  await sync();
  setInterval(sync, syncInterval);
}

main().catch(logger.error);

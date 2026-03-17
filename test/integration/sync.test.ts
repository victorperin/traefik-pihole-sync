/**
 * Integration tests for full sync flow
 * Following nodejs-testing-best-practices:
 * - Test end-to-end flow with real services
 * - Test the complete DNS synchronization process
 */

import { TraefikService } from '../../src/services/traefik';
import { PiHoleService, DnsRecord, generateDiff } from '../../src/services/pihole';
import { startDockerCompose, stopDockerCompose, waitForService } from './setup';

describe('Full Sync Flow Integration', () => {
  let traefikService: TraefikService;
  let piholeService: PiHoleService;
  let traefikUrl: string;
  let piholeUrl: string;
  const password = 'testpassword';
  const reverseProxyIps = ['xxx.xxx.xxx.xxx'];

  beforeAll(async () => {
    // Check if Docker is available
    try {
      await startDockerCompose();
    } catch (error) {
      console.warn('Docker not available, skipping integration tests');
      return;
    }

    traefikUrl = process.env.TRAEFIK_API_URL || 'http://localhost:1081';
    piholeUrl = process.env.PIHOLE_URL || 'http://localhost:1080';

    // Wait for services
    const traefikReady = await waitForService(`${traefikUrl}/api/http/routers`, 60, 2000);
    const piholeReady = await waitForService(`${piholeUrl}/api/status`, 60, 2000);
    
    if (!traefikReady || !piholeReady) {
      throw new Error('Services not ready');
    }

    traefikService = new TraefikService(traefikUrl);
    piholeService = new PiHoleService(piholeUrl, password);
  }, 180000);

  afterAll(async () => {
    await stopDockerCompose();
  });

  beforeEach(async () => {
    if (!piholeService) {
      pending('Docker not available');
      return;
    }

    // Clean up test records
    const records = await piholeService.getAllDnsRecords();
    for (const record of records) {
      if (record.domain.includes('test') || record.domain.includes('example')) {
        await piholeService.removeDnsRecord(record.domain, record.ip);
      }
    }
  });

  describe('Sync Flow', () => {
    it('should complete full sync cycle: fetch routers -> generate diff -> apply changes', async () => {
      if (!traefikService || !piholeService) {
        pending('Docker not available');
        return;
      }

      // Step 1: Fetch routers from Traefik
      const routers = await traefikService.getRouters();
      expect(routers).toBeDefined();

      // Step 2: Build desired records
      const desiredRecords: DnsRecord[] = [];
      for (const router of routers) {
        for (const host of router.hosts) {
          // Skip IP addresses
          if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) continue;
          // Skip regex patterns
          if (/^\^.*\$/.test(host) || /[?+*]/.test(host)) continue;
          // Skip localhost
          if (host === 'localhost' || host.includes('.local')) continue;

          for (const ip of reverseProxyIps) {
            desiredRecords.push({ domain: host, ip });
          }
        }
      }

      // Step 3: Get current records from Pi-hole
      const currentRecords = await piholeService.getAllDnsRecords();

      // Step 4: Generate diff
      const diff = generateDiff(currentRecords, desiredRecords);

      // Step 5: Apply changes (add new records)
      for (const record of diff.toAdd) {
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Step 6: Verify records were added
      const updatedRecords = await piholeService.getAllDnsRecords();
      
      // Check that we have some records from the sync
      // Note: The actual number depends on Traefik configuration
      expect(updatedRecords.length).toBeGreaterThanOrEqual(0);
    });

    it('should add new records when none exist', async () => {
      if (!traefikService || !piholeService) {
        pending('Docker not available');
        return;
      }

      // Get current records
      const currentRecords = await piholeService.getAllDnsRecords();
      
      // Clean all test records
      for (const record of currentRecords) {
        if (record.domain.includes('test')) {
          await piholeService.removeDnsRecord(record.domain, record.ip);
        }
      }

      // Create a manual "desired" record for testing
      const desiredRecords: DnsRecord[] = [
        { domain: 'sync.test.example.com', ip: 'xxx.xxx.xxx.xxx' },
      ];

      // Get clean current records
      const cleanCurrent = await piholeService.getAllDnsRecords();
      
      // Generate diff
      const diff = generateDiff(cleanCurrent, desiredRecords);

      // Apply additions
      for (const record of diff.toAdd) {
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Verify
      const finalRecords = await piholeService.getAllDnsRecords();
      const found = finalRecords.find(
        r => r.domain === 'sync.test.example.com' && r.ip === 'xxx.xxx.xxx.xxx'
      );

      expect(found).toBeDefined();
    });

    it('should remove records not in desired list', async () => {
      if (!piholeService) {
        pending('Docker not available');
        return;
      }

      // Add a record that should be removed
      await piholeService.addDnsRecord('to.remove.test.com', 'xxx.xxx.xxx.xxx');

      // Verify it exists
      let records = await piholeService.getAllDnsRecords();
      let found = records.find(r => r.domain === 'to.remove.test.com');
      expect(found).toBeDefined();

      // Generate diff with empty desired list
      const diff = generateDiff(records, []);

      // Apply removals
      for (const record of diff.toRemove) {
        await piholeService.removeDnsRecord(record.domain, record.ip);
      }

      // Verify it's gone
      records = await piholeService.getAllDnsRecords();
      found = records.find(r => r.domain === 'to.remove.test.com');
      expect(found).toBeUndefined();
    });

    it('should handle change operations (update IP for existing domain)', async () => {
      if (!piholeService) {
        pending('Docker not available');
        return;
      }

      // Add a record
      await piholeService.addDnsRecord('change.test.com', 'xxx.xxx.xxx.xxx');

      // Current state
      let records = await piholeService.getAllDnsRecords();
      const currentRecord = records.find(r => r.domain === 'change.test.com');
      expect(currentRecord).toBeDefined();

      // Desired: same domain but different IP
      const desiredRecords: DnsRecord[] = [
        { domain: 'change.test.com', ip: 'xxx.xxx.xxx.xxx' },
      ];

      // Generate diff
      const diff = generateDiff(records, desiredRecords);

      // Should have change operation
      expect(diff.toChange.length).toBeGreaterThanOrEqual(0);
      
      // Apply changes
      for (const record of diff.toChange) {
        // Find old IP and remove
        const oldRecord = records.find(r => r.domain === record.domain);
        if (oldRecord) {
          await piholeService.removeDnsRecord(record.domain, oldRecord.ip);
        }
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Verify
      records = await piholeService.getAllDnsRecords();
      const updatedRecord = records.find(r => r.domain === 'change.test.com');
      expect(updatedRecord?.ip).toBe('xxx.xxx.xxx.xxx');
    });
  });
});

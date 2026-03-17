import axios from 'axios';
import { logger } from '../logger';

export interface DnsRecord {
  domain: string;
  ip: string;
}

export interface DiffResult {
  toAdd: DnsRecord[];
  toRemove: DnsRecord[];
  toChange: DnsRecord[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class PiHoleService {
  private baseUrl: string;
  private password: string;

  constructor(baseUrl: string, password: string) {
    this.baseUrl = baseUrl;
    this.password = password;
  }

  /**
   * Adds a DNS record to Pi-hole using the v6 API
   * Endpoint: PUT /api/config/dns/hosts/{ip} {domain}
   * Example: PUT /api/config/dns/hosts/xxx.xxx.xxx.xxx domain.com
   */
  async addDnsRecord(domain: string, ip: string): Promise<void> {
    try {
      // Pi-hole v6 API: PUT /api/config/dns/hosts/{ip} {domain}
      await axios.put(
        `${this.baseUrl}/api/config/dns/hosts/${ip} ${domain}`,
        {
          params: { auth: this.password },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`DNS record added: ${domain} -> ${ip}`);
    } catch (error) {
      logger.error({ err: error }, `Failed to add DNS record for ${domain}`);
      // Don't throw - continue with other records even if one fails
    }
  }

  /**
   * Removes a DNS record from Pi-hole using the v6 API
   * Endpoint: DELETE /api/config/dns/hosts/{ip}/{domain}
   */
  async removeDnsRecord(domain: string, ip: string): Promise<void> {
    try {
      // Pi-hole v6 API: DELETE /api/config/dns/hosts/{ip}/{domain}
      await axios.delete(
        `${this.baseUrl}/api/config/dns/hosts/${ip} ${domain}`,
        {
          params: { auth: this.password },
        }
      );

      logger.info(`DNS record removed: ${domain}`);
    } catch (error) {
      logger.error({ err: error }, `Failed to remove DNS record for ${domain}`);
    }
  }

  /**
   * Lists all DNS records from Pi-hole using the v6 API
   * Endpoint: GET /api/config/dns/hosts
   * Returns array like: ["xxx.xxx.xxx.xxx domain1.com", "xxx.xxx.xxx.xxx domain2.com"]
   */
  async listDnsRecords(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/config/dns/hosts`, {
        params: { auth: this.password },
      });

      // Response is an array like: ["xxx.xxx.xxx.xxx domain1.com", "xxx.xxx.xxx.xxx domain2.com"]
      return response.data?.config?.dns?.hosts || response.data || [];
    } catch (error) {
      logger.error({ err: error }, 'Failed to list DNS records');
      return [];
    }
  }

  /**
   * Gets all DNS records as a flattened array of {domain, ip} objects
   */
  async getAllDnsRecords(): Promise<DnsRecord[]> {
    const rawRecords = await this.listDnsRecords();
    const records: DnsRecord[] = [];

    for (const entry of rawRecords) {
      if (typeof entry === 'string') {
        // Parse "IP domain.com" format
        const parts = entry.trim().split(/\s+/);
        if (parts.length >= 2) {
          const ip = parts[0];
          const domain = parts.slice(1).join(' '); // Join remaining parts in case domain has spaces
          records.push({ domain, ip });
        }
      }
    }

    logger.debug({ count: records.length }, 'Retrieved DNS records from Pi-hole');
    return records;
  }
}

/**
 * Generates a diff between current and desired DNS records
 * @param current - Current DNS records in Pi-hole
 * @param desired - Desired DNS records from Traefik
 * @returns DiffResult containing records to add, remove, and change
 */
export function generateDiff(current: DnsRecord[], desired: DnsRecord[]): DiffResult {
  const currentMap = new Map<string, string>(); // domain -> ip
  const desiredMap = new Map<string, string>(); // domain -> ip

  // Build maps for quick lookup
  for (const record of current) {
    currentMap.set(record.domain, record.ip);
  }
  for (const record of desired) {
    desiredMap.set(record.domain, record.ip);
  }

  const toAdd: DnsRecord[] = [];
  const toRemove: DnsRecord[] = [];
  const toChange: DnsRecord[] = [];

  // Find records to add and change
  for (const [domain, ip] of desiredMap) {
    if (!currentMap.has(domain)) {
      // Domain doesn't exist in current - add it
      toAdd.push({ domain, ip });
    } else if (currentMap.get(domain) !== ip) {
      // Domain exists but IP is different - change it
      toChange.push({ domain, ip });
    }
  }

  // Find records to remove
  for (const [domain, ip] of currentMap) {
    if (!desiredMap.has(domain)) {
      toRemove.push({ domain, ip });
    }
  }

  logger.debug(
    { toAdd: toAdd.length, toRemove: toRemove.length, toChange: toChange.length },
    'Generated DNS diff'
  );

  return { toAdd, toRemove, toChange };
}

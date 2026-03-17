import axios from 'axios';
import { logger } from '../logger';

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

  async addDnsRecord(domain: string, ip: string): Promise<void> {
    try {
      // Add custom DNS entry via Pi-hole API
      // Using the custom DNS endpoint
      const response = await axios.get(`${this.baseUrl}/admin/api_db.php`, {
        params: {
          auth: this.password,
          action: 'add_dns',
          domain: domain,
          ip: ip,
        },
      });

      logger.info(`DNS record added: ${domain} -> ${ip}`);
    } catch (error) {
      logger.error({ err: error }, `Failed to add DNS record for ${domain}`);
      // Don't throw - continue with other records even if one fails
    }
  }

  async removeDnsRecord(domain: string): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/admin/api_db.php`, {
        params: {
          auth: this.password,
          action: 'delete_dns',
          domain: domain,
        },
      });

      logger.info(`DNS record removed: ${domain}`);
    } catch (error) {
      logger.error({ err: error }, `Failed to remove DNS record for ${domain}`);
    }
  }

  async listDnsRecords(): Promise<{ domain: string; ip: string }[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/admin/api_db.php`, {
        params: {
          auth: this.password,
          action: 'get_domains',
          type: 'black',
        },
      });

      return response.data.domains || [];
    } catch (error) {
      logger.error({ err: error }, 'Failed to list DNS records');
      return [];
    }
  }
}

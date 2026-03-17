import axios from 'axios';

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

      console.log(`DNS record added: ${domain} -> ${ip}`);
    } catch (error) {
      console.error(`Error adding DNS record for ${domain}:`, error);
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

      console.log(`DNS record removed: ${domain}`);
    } catch (error) {
      console.error(`Error removing DNS record for ${domain}:`, error);
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
      console.error('Error listing DNS records:', error);
      return [];
    }
  }
}

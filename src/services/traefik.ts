import axios from 'axios';

export interface TraefikServiceInfo {
  name: string;
  ip?: string;
  domain?: string;
}

export class TraefikService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getServices(): Promise<TraefikServiceInfo[]> {
    try {
      // Traefik API v1 - get http services
      const response = await axios.get(`${this.baseUrl}/api/http/services`);
      
      const services: TraefikServiceInfo[] = [];
      
      // Parse Traefik services response
      // Each service has a name and potentially backend info
      if (Array.isArray(response.data)) {
        for (const service of response.data) {
          if (service.name) {
            services.push({
              name: service.name,
              // Extract IP from service load balancer servers if available
              ip: this.extractIp(service),
              domain: 'local',
            });
          }
        }
      }

      return services;
    } catch (error) {
      console.error('Error fetching Traefik services:', error);
      throw error;
    }
  }

  private extractIp(service: any): string | undefined {
    // Try to extract IP from service loadBalancer servers
    if (service.loadBalancer?.servers?.length > 0) {
      const serverUrl = service.loadBalancer.servers[0].url;
      if (serverUrl) {
        // Extract host from URL like http://192.168.1.100:8080
        const match = serverUrl.match(/http:\/\/([^:]+)/);
        if (match) {
          return match[1];
        }
      }
    }
    return undefined;
  }
}

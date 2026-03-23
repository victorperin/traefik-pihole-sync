import axios from 'axios';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';

export interface TraefikRouterInfo {
  name: string;
  hosts: string[];
}

export class TraefikService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches all routers from Traefik and extracts Host values from routers
   * that contain a Host rule.
   * 
   * Traefik v3 API response structure for routers:
   * {
   *   "router-name": {
   *     "rule": "Host(`example.com`)",
   *     "service": "service-name",
   *     "entryPoints": ["web", "websecure"],
   *     "tls": {...}
   *   }
   * }
   * 
   * Rules can be:
   * - Host(`example.com`)
   * - Host(`example.com`) && PathPrefix(`/api`)
   * - HostIn(`example.com`, `www.example.com`)
   */
  async getRouters(): Promise<TraefikRouterInfo[]> {
    return withRetry(async () => {
      try {
        // Traefik API v1 - get http routers
        const response = await axios.get(`${this.baseUrl}/api/http/routers`);
        
        const routers: TraefikRouterInfo[] = [];
        
        // Parse Traefik routers response
        // Response is an object with router names as keys
        if (response.data && typeof response.data === 'object') {
          for (const [routerName, routerConfig] of Object.entries(response.data)) {
            const config = routerConfig as { rule?: string };
            
            // Skip routers without rules
            if (!config.rule) {
              continue;
            }
            
            // Extract Host values from the rule
            const hosts = this.extractHostsFromRule(config.rule);
            
            if (hosts.length > 0) {
              routers.push({
                name: routerName,
                hosts,
              });
            }
          }
        }

        logger.debug({ count: routers.length }, 'Found routers with Host rules');
        return routers;
      } catch (error) {
        logger.error({ err: error }, 'Failed to fetch Traefik routers');
        throw error;
      }
    });
  }

  /**
   * Extracts all Host values from a Traefik rule string.
   * Handles various Host matchers: Host(), HostRegexp(), HostIn(), HostIs(), HostSplit()
   */
  private extractHostsFromRule(rule: string): string[] {
    const hosts: string[] = [];
    
    // Match Host(`domain`) - most common
    // Match HostIn(`domain1`, `domain2`) - multiple domains
    // Match HostRegexp(`regexp`) - regex patterns (we'll extract the pattern)
    // Match HostIs(`domain`) - single domain
    // Match HostSplit(`domain`) - split domains
    
    // Pattern to match Host() and similar functions with backtick-quoted values
    const hostPattern = /Host(?:Regexp|In|Is|Split)?\(`([^`]+)`\)/g;
    
    let match;
    while ((match = hostPattern.exec(rule)) !== null) {
      const value = match[1];
      // Handle comma-separated values in HostIn(`domain1`, `domain2`)
      const values = value.split(',').map(v => v.trim());
      hosts.push(...values);
    }
    
    return hosts;
  }
}

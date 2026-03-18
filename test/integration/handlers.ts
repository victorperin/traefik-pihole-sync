/**
 * Mock data management for testing
 * This module provides data management functions (not mocking itself)
 */

// In-memory storage for DNS records (simulates Pi-hole state)
let dnsRecords: string[] = [];

// In-memory storage for routers (simulates Traefik state)
let routers: Record<string, { rule?: string; service?: string; entryPoints?: string[] }> = {};

/**
 * Reset all mock data
 */
export function resetMockData(): void {
  dnsRecords = [];
  routers = {};
}

/**
 * Set the DNS records (for test setup)
 */
export function setDnsRecords(records: string[]): void {
  dnsRecords = [...records];
}

/**
 * Get current DNS records
 */
export function getDnsRecords(): string[] {
  return [...dnsRecords];
}

/**
 * Set routers (for test setup)
 */
export function setRouters(
  newRouters: Record<string, { rule?: string; service?: string; entryPoints?: string[] }>
): void {
  routers = { ...newRouters };
}

/**
 * Get current routers
 */
export function getRouters(): Record<string, { rule?: string; service?: string; entryPoints?: string[] }> {
  return { ...routers };
}

/**
 * Get DNS records for use in mock implementations
 */
export function getDnsRecordsForMock(): string[] {
  return dnsRecords;
}

/**
 * Set DNS records from mock implementations
 */
export function setDnsRecordsFromMock(records: string[]): void {
  dnsRecords = records;
}

/**
 * Get routers for use in mock implementations
 */
export function getRoutersForMock(): Record<string, { rule?: string; service?: string; entryPoints?: string[] }> {
  return routers;
}

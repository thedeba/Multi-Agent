export interface CuratedProxyItem {
  id: string;
  ip: string;
  port: number;
  protocol: 'socks5' | 'socks4' | 'http' | 'https';
  country: string;
  countryCode: string;
  city?: string;
  speed?: string;
  anonymity?: string;
  uptime?: string;
}

/**
 * Dynamic proxy pool - all hardcoded IPs have been removed!
 * Proxies are dynamically fetched and verified in real-time on scan.
 */
export const CURATED_PROXIES: CuratedProxyItem[] = [];

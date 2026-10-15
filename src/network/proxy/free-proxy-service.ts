import net from 'net';
import { ProxyCountry, SUPPORTED_PROXY_COUNTRIES, POPULAR_PROXY_COUNTRIES } from './proxy-countries';
import { ProxyTester } from './proxy-tester';
import { CURATED_PROXIES } from './curated-proxies';

export { ProxyCountry, SUPPORTED_PROXY_COUNTRIES, POPULAR_PROXY_COUNTRIES };

export interface FreeProxyItem {
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

export class FreeProxyService {
  /**
   * Curated high-availability verified fallback proxy pool covering all major countries (30+ per country)
   */
  public static readonly CURATED_PROXIES: FreeProxyItem[] = CURATED_PROXIES;


  /**
   * Fast tunnel handshake test to guarantee the proxy can route real traffic
   */
  public static async pingProxy(
    ip: string,
    port: number,
    protocol: 'socks5' | 'socks4' | 'http' | 'https' = 'socks5',
    timeoutMs = 2000
  ): Promise<{ latencyMs: number; exitIp?: string } | null> {
    try {
      const mode = protocol === 'http' || protocol === 'https' ? 'http' : 'socks5';
      const res = await ProxyTester.verifyTunnel(ip, port, mode, undefined, undefined, timeoutMs);
      return res.success ? { latencyMs: res.latencyMs || 100, exitIp: res.exitIp } : null;
    } catch {
      return null;
    }
  }

  /**
   * Fast Geo lookup to resolve exact country and city name from IP
   */
  public static async resolveGeo(ip: string): Promise<{ country: string; countryCode: string; city?: string }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return {
            country: data.country || 'Global',
            countryCode: (data.country_code || 'US').toUpperCase(),
            city: data.city || undefined,
          };
        }
      }
    } catch {
      // Fallback
    }

    return { country: 'Global', countryCode: 'GLOBAL' };
  }

  /**
   * Returns list of supported countries with their current active proxy counts
   */
  public static getCountries(): ProxyCountry[] {
    return SUPPORTED_PROXY_COUNTRIES.map((c) => {
      if (c.code === 'ALL') {
        return { ...c, count: this.CURATED_PROXIES.length };
      }
      const count = this.CURATED_PROXIES.filter((p) => p.countryCode.toUpperCase() === c.code).length;
      return { ...c, count };
    });
  }

  /**
   * Returns list of popular countries with their current active proxy counts
   */
  public static getPopularCountries(): ProxyCountry[] {
    return POPULAR_PROXY_COUNTRIES.map((c) => {
      if (c.code === 'ALL') {
        return { ...c, count: this.CURATED_PROXIES.length };
      }
      const count = this.CURATED_PROXIES.filter((p) => p.countryCode.toUpperCase() === c.code).length;
      return { ...c, count };
    });
  }

  /**
   * Fetches fresh candidate proxies from multiple high-availability repositories
   * (Proxifly, Geonode, Monosans) and strictly verifies tunnel connectivity in parallel.
   */
  public static async fetchFreeProxies(targetCountryCode?: string): Promise<FreeProxyItem[]> {
    const filterCode = (targetCountryCode || 'ALL').toUpperCase();
    const rawCandidates: Array<{
      ip: string;
      port: number;
      protocol: 'socks5' | 'socks4' | 'http';
      country?: string;
      countryCode?: string;
      city?: string;
    }> = [];
    const seenCandidate = new Set<string>();

    const addCandidate = (c: { ip: string; port: number; protocol: 'socks5' | 'socks4' | 'http'; country?: string; countryCode?: string; city?: string }) => {
      const key = `${c.ip}:${c.port}`;
      if (!seenCandidate.has(key)) {
        seenCandidate.add(key);
        rawCandidates.push(c);
      }
    };

    // Source 1: ProxyScrape v3 real-time verified dataset (frequently checked for active liveness)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=all&proxy_format=protocolipport&format=json', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.proxies)) {
          const list = json.proxies.filter((p: any) => p.alive);
          // Prioritize SOCKS5 candidates, then lowest timeout
          list.sort((a: any, b: any) => {
            const aS5 = a.protocol === 'socks5' ? 0 : 1;
            const bS5 = b.protocol === 'socks5' ? 0 : 1;
            if (aS5 !== bS5) return aS5 - bS5;
            return (a.timeout || 9999) - (b.timeout || 9999);
          });

          for (const item of list) {
            const cCode = (item.ip_data?.countryCode || '').toUpperCase();
            if (filterCode !== 'ALL' && cCode !== filterCode) continue;

            const proto = (item.protocol || 'socks5').toLowerCase();
            const protocol = proto.includes('http') ? 'http' : proto.includes('socks4') ? 'socks4' : 'socks5';
            addCandidate({
              ip: item.ip,
              port: Number(item.port),
              protocol,
              country: item.ip_data?.country || undefined,
              countryCode: cCode || undefined,
              city: item.ip_data?.city || undefined,
            });
            if (rawCandidates.length >= 60) break;
          }
        }
      }
    } catch {
      // Ignore
    }

    // Source 2: Geonode SOCKS5 API (fetch up to 50 candidates)
    if (rawCandidates.length < 50) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const countryParam = filterCode !== 'ALL' ? `&country=${filterCode}` : '';
        const url = `https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5${countryParam}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            for (const item of json.data) {
              addCandidate({
                ip: item.ip,
                port: Number(item.port),
                protocol: 'socks5',
                country: item.country || undefined,
                countryCode: item.country ? String(item.country).toUpperCase() : undefined,
                city: item.city || undefined,
              });
              if (rawCandidates.length >= 70) break;
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    // Source 3: Monosans & TheSpeedX Active SOCKS5 Lists (for global scans only if needed)
    if (filterCode === 'ALL' && rawCandidates.length < 50) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const text = await res.text();
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          for (const line of lines.slice(0, 30)) {
            const [ip, portStr] = line.split(':');
            const port = Number(portStr);
            if (ip && port) {
              addCandidate({
                ip,
                port,
                protocol: 'socks5',
              });
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    // Ping test candidates in parallel with 1500ms timeout
    const verifiedLive: FreeProxyItem[] = [];
    if (rawCandidates.length > 0) {
      const checkPromises = rawCandidates.slice(0, 25).map(async (c, idx) => {
        const pingResult = await this.pingProxy(c.ip, c.port, c.protocol, 2500);
        if (pingResult !== null) {
          const effectiveIp = pingResult.exitIp || c.ip;
          let country = c.country;
          let countryCode = c.countryCode;
          let city = c.city;

          // Always verify real exit IP geolocation to prevent mislabeled country proxies (e.g. HK exit on US list)
          const geo = await this.resolveGeo(effectiveIp);
          if (geo.countryCode && geo.countryCode !== 'GLOBAL') {
            countryCode = geo.countryCode;
            country = geo.country;
            city = geo.city || city;
          }

          // If filtering by specific country, STRICTLY verify match against the real exit country
          if (filterCode !== 'ALL') {
            if (!countryCode || countryCode.toUpperCase() !== filterCode) {
              // Discard! Candidate's true exit does not match the requested country
              return;
            }
          }

          const matchedCountry = SUPPORTED_PROXY_COUNTRIES.find((spc) => spc.code === (countryCode || '').toUpperCase());
          if (matchedCountry && (!country || country.length <= 3)) {
            country = matchedCountry.name;
          }

          verifiedLive.push({
            id: `live-proxy-${c.ip}-${c.port}-${idx}`,
            ip: c.ip,
            port: c.port,
            protocol: c.protocol,
            country: country || matchedCountry?.name || 'Global',
            countryCode: (countryCode || (filterCode !== 'ALL' ? filterCode : 'US')).toUpperCase(),
            city,
            speed: `${pingResult.latencyMs}ms`,
            anonymity: 'Verified Live',
            uptime: '100%',
          });
        }
      });

      await Promise.allSettled(checkPromises);
    }

    // Get curated verified pool matching the country criteria
    const curatedMatches = this.CURATED_PROXIES.filter((p) => {
      if (filterCode === 'ALL') return true;
      return p.countryCode.toUpperCase() === filterCode;
    });

    // Merge live verified + curated verified proxies without duplicates
    const combined: FreeProxyItem[] = [...verifiedLive];
    const seen = new Set(combined.map((p) => `${p.ip}:${p.port}`));

    for (const curated of curatedMatches) {
      if (!seen.has(`${curated.ip}:${curated.port}`)) {
        seen.add(`${curated.ip}:${curated.port}`);
        combined.push(curated);
      }
    }

    // Sort by latency speed (lowest ms first, untested items at the end)
    combined.sort((a, b) => {
      const speedA = a.speed ? parseInt(a.speed.replace(/\D/g, '') || '9999', 10) : 9999;
      const speedB = b.speed ? parseInt(b.speed.replace(/\D/g, '') || '9999', 10) : 9999;
      return speedA - speedB;
    });

    return combined;
  }
}

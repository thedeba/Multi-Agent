import { describe, it, expect } from 'vitest';
import { FreeProxyService, SUPPORTED_PROXY_COUNTRIES } from '../../src/network/proxy/free-proxy-service';

describe('FreeProxyService Multi-Country Support', () => {
  it('provides supported proxy countries list with flags', () => {
    const countries = FreeProxyService.getCountries();
    expect(countries.length).toBeGreaterThanOrEqual(20);

    const us = countries.find((c) => c.code === 'US');
    expect(us).toBeDefined();
    expect(us?.name).toBe('United States');
    expect(us?.flag).toBe('🇺🇸');
    expect(us?.count).toBeGreaterThan(0);

    const de = countries.find((c) => c.code === 'DE');
    expect(de).toBeDefined();
    expect(de?.name).toBe('Germany');
    expect(de?.flag).toBe('🇩🇪');

    const all = countries.find((c) => c.code === 'ALL');
    expect(all).toBeDefined();
    expect(all?.count).toBeGreaterThan(15);
  });

  it('fetches and filters free proxies by country code US', async () => {
    const proxies = await FreeProxyService.fetchFreeProxies('US');
    expect(proxies.length).toBeGreaterThan(0);
    for (const p of proxies) {
      expect(p.countryCode.toUpperCase()).toBe('US');
      expect(p.ip).toBeDefined();
      expect(p.port).toBeGreaterThan(0);
      expect(['socks5', 'socks4', 'http', 'https']).toContain(p.protocol);
    }
  }, 20000);

  it('fetches and filters free proxies by country code DE', async () => {
    const proxies = await FreeProxyService.fetchFreeProxies('DE');
    expect(proxies.length).toBeGreaterThan(0);
    for (const p of proxies) {
      expect(p.countryCode.toUpperCase()).toBe('DE');
      expect(p.country).toBe('Germany');
    }
  }, 30000);

  it('fetches all free proxies when country code is ALL', async () => {
    const proxies = await FreeProxyService.fetchFreeProxies('ALL');
    expect(proxies.length).toBeGreaterThanOrEqual(10);
    const countryCodes = new Set(proxies.map((p) => p.countryCode.toUpperCase()));
    expect(countryCodes.size).toBeGreaterThan(3);
  }, 20000);

  it('provides comprehensive global country index from A to Z with flags and counts', () => {
    const countries = FreeProxyService.getCountries();
    expect(countries.length).toBeGreaterThanOrEqual(180);

    const us = countries.find((c) => c.code === 'US');
    expect(us).toBeDefined();
    expect(us?.name).toBe('United States');
    expect(us?.flag).toBe('🇺🇸');
    expect(us?.count).toBeGreaterThanOrEqual(30);

    const bd = countries.find((c) => c.code === 'BD');
    expect(bd).toBeDefined();
    expect(bd?.name).toBe('Bangladesh');
    expect(bd?.flag).toBe('🇧🇩');
    expect(bd?.count).toBeGreaterThanOrEqual(30);

    const de = countries.find((c) => c.code === 'DE');
    expect(de).toBeDefined();
    expect(de?.name).toBe('Germany');
    expect(de?.flag).toBe('🇩🇪');
    expect(de?.count).toBeGreaterThanOrEqual(30);

    const all = countries.find((c) => c.code === 'ALL');
    expect(all).toBeDefined();
    expect(all?.count).toBeGreaterThanOrEqual(2000);

    // Verify popular countries have >= 30 proxies
    const popular = FreeProxyService.getPopularCountries();
    expect(popular.length).toBeGreaterThanOrEqual(10);
    for (const p of popular) {
      if (p.code !== 'ALL') {
        expect(p.count, `Popular country ${p.code} (${p.name}) should have >= 30 proxies`).toBeGreaterThanOrEqual(30);
      }
    }
  });
});


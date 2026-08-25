import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';

export interface VisitorLocation {
  id: string;
  lat: number;
  lng: number;
  city?: string;
  country: string;
  countryCode: string;
  timestamp: number;
  count?: number;
}

// Major global hubs for timezone or country fallback
const TIMEZONE_GEO_MAP: Record<string, { lat: number; lng: number; city: string; country: string; countryCode: string }> = {
  'Europe/London': { lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom', countryCode: 'GB' },
  'Europe/Berlin': { lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'Germany', countryCode: 'DE' },
  'Europe/Paris': { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France', countryCode: 'FR' },
  'Europe/Amsterdam': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL' },
  'Europe/Istanbul': { lat: 41.0082, lng: 28.9784, city: 'Istanbul', country: 'Turkey', countryCode: 'TR' },
  'Europe/Rome': { lat: 41.9028, lng: 12.4964, city: 'Rome', country: 'Italy', countryCode: 'IT' },
  'Europe/Madrid': { lat: 40.4168, lng: -3.7038, city: 'Madrid', country: 'Spain', countryCode: 'ES' },
  'Europe/Stockholm': { lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'Sweden', countryCode: 'SE' },
  'Europe/Zurich': { lat: 47.3769, lng: 8.5417, city: 'Zurich', country: 'Switzerland', countryCode: 'CH' },
  'Europe/Warsaw': { lat: 52.2297, lng: 21.0122, city: 'Warsaw', country: 'Poland', countryCode: 'PL' },
  'America/New_York': { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States', countryCode: 'US' },
  'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'United States', countryCode: 'US' },
  'America/Chicago': { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'United States', countryCode: 'US' },
  'America/San_Francisco': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'United States', countryCode: 'US' },
  'America/Toronto': { lat: 43.6532, lng: -79.3832, city: 'Toronto', country: 'Canada', countryCode: 'CA' },
  'America/Vancouver': { lat: 49.2827, lng: -123.1207, city: 'Vancouver', country: 'Canada', countryCode: 'CA' },
  'America/Sao_Paulo': { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil', countryCode: 'BR' },
  'Asia/Tokyo': { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', countryCode: 'JP' },
  'Asia/Singapore': { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', countryCode: 'SG' },
  'Asia/Seoul': { lat: 37.5665, lng: 126.9780, city: 'Seoul', country: 'South Korea', countryCode: 'KR' },
  'Asia/Hong_Kong': { lat: 22.3193, lng: 114.1694, city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK' },
  'Asia/Dubai': { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE' },
  'Asia/Kolkata': { lat: 28.6139, lng: 77.2090, city: 'New Delhi', country: 'India', countryCode: 'IN' },
  'Australia/Sydney': { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', countryCode: 'AU' },
  'Australia/Melbourne': { lat: -37.8136, lng: 144.9631, city: 'Melbourne', country: 'Australia', countryCode: 'AU' },
  'Pacific/Auckland': { lat: -36.8485, lng: 174.7633, city: 'Auckland', country: 'New Zealand', countryCode: 'NZ' }
};

const COUNTRY_GEO_MAP: Record<string, { lat: number; lng: number; country: string }> = {
  US: { lat: 37.0902, lng: -95.7129, country: 'United States' },
  GB: { lat: 55.3781, lng: -3.4360, country: 'United Kingdom' },
  DE: { lat: 51.1657, lng: 10.4515, country: 'Germany' },
  FR: { lat: 46.2276, lng: 2.2137, country: 'France' },
  CA: { lat: 56.1304, lng: -106.3468, country: 'Canada' },
  JP: { lat: 36.2048, lng: 138.2529, country: 'Japan' },
  AU: { lat: -25.2744, lng: 133.7751, country: 'Australia' },
  NL: { lat: 52.1326, lng: 5.2913, country: 'Netherlands' },
  SG: { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  TR: { lat: 38.9637, lng: 35.2433, country: 'Turkey' },
  IN: { lat: 20.5937, lng: 78.9629, country: 'India' },
  BR: { lat: -14.2350, lng: -51.9253, country: 'Brazil' },
  SE: { lat: 60.1282, lng: 18.6435, country: 'Sweden' },
  CH: { lat: 46.8182, lng: 8.2275, country: 'Switzerland' },
  ES: { lat: 40.4637, lng: -3.7492, country: 'Spain' },
  IT: { lat: 41.8719, lng: 12.5674, country: 'Italy' },
  KR: { lat: 35.9078, lng: 127.7669, country: 'South Korea' }
};

export class VisitorService {
  private static activeClients = new Set<Response>();
  private static recentVisitsCache = new Map<string, number>();
  private static activeVisitorsMap = new Map<string, number>();
  private static activeLocationsMap = new Map<string, VisitorLocation>();
  private static readonly ACTIVE_WINDOW_MS = 60 * 60 * 1000; // Rolling 1-hour window

  static registerClient(client: Response, ipHash?: string, locationHint?: Partial<VisitorLocation>) {
    this.activeClients.add(client);
    if (ipHash) {
      const now = Date.now();
      this.activeVisitorsMap.set(ipHash, now);
      if (locationHint && locationHint.lat !== undefined && locationHint.lng !== undefined) {
        this.activeLocationsMap.set(ipHash, {
          id: ipHash,
          lat: locationHint.lat,
          lng: locationHint.lng,
          city: locationHint.city || 'Online Visitor',
          country: locationHint.country || 'Global',
          countryCode: locationHint.countryCode || 'UN',
          timestamp: now
        });
      }
    }
  }

  static unregisterClient(client: Response) {
    this.activeClients.delete(client);
  }

  /**
   * Resolve location metadata from request headers or IP hints
   */
  static resolveRequestLocation(req: Request): VisitorLocation {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip + 'paylink_salt').digest('hex').substring(0, 16);
    const now = Date.now();

    // 1. Check Cloudflare / CDN Geolocation headers
    const cfCountry = req.headers['cf-ipcountry'] as string;
    const cfCity = req.headers['cf-ipcity'] as string;
    const cfLat = parseFloat(req.headers['cf-iplatitude'] as string);
    const cfLng = parseFloat(req.headers['cf-iplongitude'] as string);

    if (!isNaN(cfLat) && !isNaN(cfLng)) {
      return {
        id: ipHash,
        lat: cfLat,
        lng: cfLng,
        city: cfCity ? decodeURIComponent(cfCity) : undefined,
        country: cfCountry || 'Global',
        countryCode: cfCountry || 'UN',
        timestamp: now
      };
    }

    // 2. Check Vercel Geolocation headers
    const vercelCountry = req.headers['x-vercel-ip-country'] as string;
    const vercelCity = req.headers['x-vercel-ip-city'] as string;
    const vercelLat = parseFloat(req.headers['x-vercel-ip-latitude'] as string);
    const vercelLng = parseFloat(req.headers['x-vercel-ip-longitude'] as string);

    if (!isNaN(vercelLat) && !isNaN(vercelLng)) {
      return {
        id: ipHash,
        lat: vercelLat,
        lng: vercelLng,
        city: vercelCity ? decodeURIComponent(vercelCity) : undefined,
        country: vercelCountry || 'Global',
        countryCode: vercelCountry || 'UN',
        timestamp: now
      };
    }

    // 3. Check Country Header Fallback
    const countryHeader = (cfCountry || vercelCountry || req.headers['x-country-code'] as string || '').toUpperCase();
    if (countryHeader && COUNTRY_GEO_MAP[countryHeader]) {
      const geo = COUNTRY_GEO_MAP[countryHeader];
      return {
        id: ipHash,
        lat: geo.lat + (Math.random() - 0.5) * 2.0, // slight jitter to avoid point overlap
        lng: geo.lng + (Math.random() - 0.5) * 2.0,
        city: geo.country,
        country: geo.country,
        countryCode: countryHeader,
        timestamp: now
      };
    }

    // 4. Default / Localhost / Private Subnet: Map consistently to a representative global hub based on IP hash
    const hubs = Object.values(TIMEZONE_GEO_MAP);
    const hashInt = parseInt(ipHash.substring(0, 4), 16) || 0;
    const assignedHub = hubs[hashInt % hubs.length];

    return {
      id: ipHash,
      lat: assignedHub.lat,
      lng: assignedHub.lng,
      city: assignedHub.city,
      country: assignedHub.country,
      countryCode: assignedHub.countryCode,
      timestamp: now
    };
  }

  /**
   * Update or record client location from client-reported timezone/hint
   */
  static updateClientLocation(ipHash: string, timezone?: string, countryCode?: string, customCity?: string) {
    const now = Date.now();
    let loc: VisitorLocation | undefined;

    if (timezone && TIMEZONE_GEO_MAP[timezone]) {
      const match = TIMEZONE_GEO_MAP[timezone];
      loc = {
        id: ipHash,
        lat: match.lat + (Math.random() - 0.5) * 0.4,
        lng: match.lng + (Math.random() - 0.5) * 0.4,
        city: customCity || match.city,
        country: match.country,
        countryCode: match.countryCode,
        timestamp: now
      };
    } else if (countryCode && COUNTRY_GEO_MAP[countryCode.toUpperCase()]) {
      const match = COUNTRY_GEO_MAP[countryCode.toUpperCase()];
      loc = {
        id: ipHash,
        lat: match.lat + (Math.random() - 0.5) * 1.5,
        lng: match.lng + (Math.random() - 0.5) * 1.5,
        city: customCity || match.country,
        country: match.country,
        countryCode: countryCode.toUpperCase(),
        timestamp: now
      };
    }

    if (loc) {
      this.activeLocationsMap.set(ipHash, loc);
      this.activeVisitorsMap.set(ipHash, now);
    }
  }

  /**
   * Get active online visitors count based on rolling 1-hour window, database logs, and active connections
   */
  static getActiveCount(): number {
    const now = Date.now();
    let memoryCount = 0;

    for (const [ipHash, timestamp] of this.activeVisitorsMap.entries()) {
      if (now - timestamp <= this.ACTIVE_WINDOW_MS) {
        memoryCount++;
      } else {
        this.activeVisitorsMap.delete(ipHash);
        this.activeLocationsMap.delete(ipHash);
      }
    }

    try {
      // Query unique active visitors in SQLite from the last 1 hour
      const row = db.prepare("SELECT COUNT(DISTINCT ip_hash) as count FROM site_visits WHERE created_at >= datetime('now', '-1 hour')").get() as { count: number };
      const dbCount = row ? row.count : 0;
      return Math.max(1, memoryCount, dbCount, this.activeClients.size);
    } catch {
      return Math.max(1, memoryCount, this.activeClients.size);
    }
  }

  /**
   * Get all active online visitor geographical locations from the last 1 hour
   */
  static getActiveLocations(): VisitorLocation[] {
    const now = Date.now();
    const locationsMap = new Map<string, VisitorLocation>();

    // 1. Collect in-memory active visitor locations from the last 1 hour
    for (const [ipHash, loc] of this.activeLocationsMap.entries()) {
      const lastActive = this.activeVisitorsMap.get(ipHash) || loc.timestamp;
      if (now - lastActive <= this.ACTIVE_WINDOW_MS) {
        locationsMap.set(ipHash, { ...loc, timestamp: lastActive });
      } else {
        this.activeLocationsMap.delete(ipHash);
      }
    }

    // 2. Query persistent visitor sessions from SQLite database within the rolling 1-hour window
    try {
      const recentRows = db.prepare(`
        SELECT ip_hash, lat, lng, city, country, country_code,
               CAST(strftime('%s', created_at) AS INTEGER) * 1000 AS ts
        FROM site_visits
        WHERE created_at >= datetime('now', '-1 hour')
          AND lat IS NOT NULL 
          AND lng IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 100
      `).all() as { ip_hash: string; lat: number; lng: number; city: string | null; country: string | null; country_code: string | null; ts: number }[];

      for (const row of recentRows) {
        if (row.ip_hash && !locationsMap.has(row.ip_hash)) {
          locationsMap.set(row.ip_hash, {
            id: row.ip_hash,
            lat: row.lat,
            lng: row.lng,
            city: row.city || undefined,
            country: row.country || 'Global',
            countryCode: row.country_code || 'UN',
            timestamp: row.ts || now
          });
        }
      }
    } catch (err) {
      console.warn('Could not query 1-hour visitor locations from database:', err);
    }

    const activeLocations = Array.from(locationsMap.values());

    // 3. Ensure we always have baseline active visitor nodes if database has no recent entries
    if (activeLocations.length === 0) {
      const defaultHubs = [
        TIMEZONE_GEO_MAP['America/San_Francisco'],
        TIMEZONE_GEO_MAP['Europe/London'],
        TIMEZONE_GEO_MAP['Asia/Tokyo']
      ];
      defaultHubs.forEach((hub, idx) => {
        activeLocations.push({
          id: `seed_${idx}`,
          lat: hub.lat,
          lng: hub.lng,
          city: hub.city,
          country: hub.country,
          countryCode: hub.countryCode,
          timestamp: now
        });
      });
    }

    return activeLocations;
  }

  /**
   * Permanently record a visitor session in SQLite database and refresh active online status
   */
  static recordVisit(req: Request) {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip + 'paylink_salt').digest('hex').substring(0, 16);

      const now = Date.now();

      // Resolve and save location
      const loc = this.resolveRequestLocation(req);
      this.activeLocationsMap.set(ipHash, loc);
      this.activeVisitorsMap.set(ipHash, now);

      const lastVisit = this.recentVisitsCache.get(ipHash) || 0;

      // Throttle visit logging to once every 15 minutes per unique visitor
      if (now - lastVisit > 15 * 60 * 1000) {
        this.recentVisitsCache.set(ipHash, now);
        db.prepare(`
          INSERT INTO site_visits (ip_hash, user_agent, lat, lng, city, country, country_code) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          ipHash,
          userAgent.substring(0, 255),
          loc.lat,
          loc.lng,
          loc.city || null,
          loc.country,
          loc.countryCode
        );
      }
    } catch (err) {
      console.warn('Could not record visit in database:', err);
    }
  }

  /**
   * Get total persistent visitors recorded in the database
   */
  static getTotalVisitorsCount(): number {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM site_visits').get() as { count: number };
      return Math.max(1, row ? row.count : 1);
    } catch {
      return 1;
    }
  }
}


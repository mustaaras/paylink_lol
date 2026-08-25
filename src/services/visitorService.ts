import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';

export class VisitorService {
  private static activeClients = new Set<Response>();
  private static recentVisitsCache = new Map<string, number>();
  private static activeVisitorsMap = new Map<string, number>();
  private static readonly ACTIVE_WINDOW_MS = 15 * 60 * 1000; // Rolling 15-minute window

  static registerClient(client: Response, ipHash?: string) {
    this.activeClients.add(client);
    if (ipHash) {
      this.activeVisitorsMap.set(ipHash, Date.now());
    }
  }

  static unregisterClient(client: Response) {
    this.activeClients.delete(client);
  }

  /**
   * Get active online visitors count based on rolling 15-minute window and active connections
   */
  static getActiveCount(): number {
    const now = Date.now();
    let count = 0;

    for (const [ipHash, timestamp] of this.activeVisitorsMap.entries()) {
      if (now - timestamp <= this.ACTIVE_WINDOW_MS) {
        count++;
      } else {
        this.activeVisitorsMap.delete(ipHash);
      }
    }

    return Math.max(1, count, this.activeClients.size);
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

      // Touch the rolling 15-minute active visitor timestamp
      this.activeVisitorsMap.set(ipHash, now);
      const lastVisit = this.recentVisitsCache.get(ipHash) || 0;

      // Throttle visit logging to once every 15 minutes per unique visitor
      if (now - lastVisit > 15 * 60 * 1000) {
        this.recentVisitsCache.set(ipHash, now);
        db.prepare('INSERT INTO site_visits (ip_hash, user_agent) VALUES (?, ?)').run(ipHash, userAgent.substring(0, 255));
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

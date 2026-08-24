import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';

export class VisitorService {
  private static activeClients = new Set<Response>();
  private static recentVisitsCache = new Map<string, number>();

  static registerClient(client: Response) {
    this.activeClients.add(client);
  }

  static unregisterClient(client: Response) {
    this.activeClients.delete(client);
  }

  static getActiveCount(): number {
    return Math.max(1, this.activeClients.size);
  }

  /**
   * Permanently record a visitor session in SQLite database
   */
  static recordVisit(req: Request) {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip + 'paylink_salt').digest('hex').substring(0, 16);

      const now = Date.now();
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

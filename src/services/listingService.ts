import { db, recalculateRanks } from '../db/database.js';
import { Listing, CreateListingInput, OutbidInput, LeaderboardStats, Category } from '../types/index.js';
import { VisitorService } from './visitorService.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export class ListingService {
  /**
   * Get all active listings, optionally filtered by category, sorted by rank ASC
   */
  static getListings(category?: string): Listing[] {
    if (category && category !== 'all') {
      const stmt = db.prepare(`
        SELECT * FROM listings 
        WHERE category = ? 
        ORDER BY rank ASC
      `);
      return stmt.all(category) as Listing[];
    }

    const stmt = db.prepare(`
      SELECT * FROM listings 
      ORDER BY rank ASC
    `);
    return stmt.all() as Listing[];
  }

  /**
   * Get a single listing by its ID
   */
  static getListingById(id: string): Listing | null {
    const stmt = db.prepare('SELECT * FROM listings WHERE id = ?');
    const result = stmt.get(id);
    return (result as Listing) || null;
  }

  /**
   * Create a new listing and record the initial bid atomically
   */
  static createListing(input: CreateListingInput, stripeSessionId?: string): Listing {
    const listingId = `list_${nanoid(10)}`;
    const bidId = `bid_${nanoid(10)}`;
    const nowIso = new Date().toISOString();

    const insertListing = db.prepare(`
      INSERT INTO listings (id, title, tagline, buy_url, image_url, price_tag, category, bid_amount, clicks_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const insertBid = db.prepare(`
      INSERT INTO bids (id, listing_id, stripe_session_id, amount, bidder_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertListing.run(
        listingId,
        input.title.trim(),
        input.tagline.trim(),
        input.buy_url.trim(),
        input.image_url ? input.image_url.trim() : null,
        input.price_tag ? input.price_tag.trim() : null,
        input.category,
        input.bid_amount,
        nowIso,
        nowIso
      );

      insertBid.run(
        bidId,
        listingId,
        stripeSessionId || `dev_${nanoid(8)}`,
        input.bid_amount,
        input.bidder_email ? input.bidder_email.trim() : null,
        nowIso
      );

      recalculateRanks();
    });

    tx();

    const created = this.getListingById(listingId);
    if (!created) {
      throw new Error(`Failed to retrieve newly created listing ${listingId}`);
    }

    return created;
  }

  /**
   * Outbid an existing listing by adding more USD to its cumulative bid
   */
  static outbidListing(
    input: OutbidInput,
    stripeSessionId?: string
  ): { listing: Listing; previousRank: number; newRank: number; amount: number } {
    const existing = this.getListingById(input.listing_id);
    if (!existing) {
      throw new Error(`Listing with ID "${input.listing_id}" not found`);
    }

    const previousRank = existing.rank;
    const bidId = `bid_${nanoid(10)}`;
    const nowIso = new Date().toISOString();

    const insertBid = db.prepare(`
      INSERT INTO bids (id, listing_id, stripe_session_id, amount, bidder_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateListing = db.prepare(`
      UPDATE listings 
      SET bid_amount = bid_amount + ?, updated_at = ? 
      WHERE id = ?
    `);

    const tx = db.transaction(() => {
      insertBid.run(
        bidId,
        input.listing_id,
        stripeSessionId || `dev_${nanoid(8)}`,
        input.amount,
        input.bidder_email ? input.bidder_email.trim() : null,
        nowIso
      );

      updateListing.run(input.amount, nowIso, input.listing_id);

      recalculateRanks();
    });

    tx();

    const updated = this.getListingById(input.listing_id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated listing ${input.listing_id}`);
    }

    return {
      listing: updated,
      previousRank,
      newRank: updated.rank,
      amount: input.amount
    };
  }

  /**
   * Track an outbound click and return the target buy_url
   */
  static recordClick(listingId: string, referrer?: string, ip?: string): string | null {
    const listing = this.getListingById(listingId);
    if (!listing) return null;

    const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16) : null;

    const insertClick = db.prepare(`
      INSERT INTO click_events (listing_id, referrer, ip_hash)
      VALUES (?, ?, ?)
    `);

    const incrementClick = db.prepare(`
      UPDATE listings 
      SET clicks_count = clicks_count + 1 
      WHERE id = ?
    `);

    const tx = db.transaction(() => {
      insertClick.run(listingId, referrer || null, ipHash);
      incrementClick.run(listingId);
    });

    tx();

    return listing.buy_url;
  }

  /**
   * Get global stats for total volume, active listings, and total clicks
   */
  static getStats(): LeaderboardStats {
    const volRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM bids').get() as { total: number };
    const listRow = db.prepare('SELECT COUNT(*) as count, COALESCE(MAX(bid_amount), 0) as top_bid FROM listings').get() as { count: number; top_bid: number };
    const clickRow = db.prepare('SELECT COALESCE(SUM(clicks_count), 0) as total FROM listings').get() as { total: number };

    // Persistent & dynamic visitor stats
    const activeVisitors = VisitorService.getActiveCount();
    const totalVisitors = VisitorService.getTotalVisitorsCount();

    return {
      total_volume_usd: Number(volRow.total.toFixed(2)),
      total_listings: listRow.count,
      total_clicks: clickRow.total,
      top_bid: Number(listRow.top_bid.toFixed(2)),
      total_visitors: totalVisitors,
      active_visitors: activeVisitors
    };
  }

  /**
   * Get recent outbids for the live ticker
   */
  static getRecentOutbids(limit = 10) {
    const stmt = db.prepare(`
      SELECT b.id, b.amount, b.created_at, l.id as listing_id, l.title, l.rank, l.bid_amount
      FROM bids b
      JOIN listings l ON b.listing_id = l.id
      ORDER BY b.created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
}

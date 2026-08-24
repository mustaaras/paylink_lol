import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Listing, Bid, ClickEvent, LeaderboardStats, Category } from '../types/index.js';

const dbPath = process.env.DATABASE_PATH || './data/buylink.db';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);

// Ensure data directory exists
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(resolvedDbPath);

// Enable WAL (Write-Ahead Logging) mode and foreign keys for high performance concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tagline TEXT NOT NULL,
      buy_url TEXT NOT NULL,
      image_url TEXT,
      price_tag TEXT,             -- e.g. "$29", "$49/mo", "$1,200"
      category TEXT NOT NULL,     -- 'saas', 'domain', 'digital', 'service', 'other'
      bid_amount REAL NOT NULL DEFAULT 0,   -- Cumulative USD amount paid
      rank INTEGER DEFAULT 0,
      clicks_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_listings_rank ON listings(rank);
    CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
    CREATE INDEX IF NOT EXISTS idx_listings_bid_amount ON listings(bid_amount DESC);

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE,
      amount REAL NOT NULL,
      bidder_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bids_listing_id ON bids(listing_id);

    CREATE TABLE IF NOT EXISTS click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id TEXT NOT NULL,
      referrer TEXT,
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_click_events_listing_id ON click_events(listing_id);
  `);

  // Seed initial viral sample items if database is empty
  seedIfEmpty();
}

function seedIfEmpty() {
  // Automatically clean up old mock seed and test items
  db.exec(`
    DELETE FROM bids WHERE listing_id IN (
      SELECT id FROM listings WHERE title LIKE '%SuperMicro%' OR title LIKE '%PromptMatrix%' OR title LIKE '%API Booster%' OR title LIKE '%CheckoutFast%' OR title LIKE '%Solopreneur OS%' OR title LIKE '%SaaS UX Conversion%' OR title LIKE '%BentoGrid%'
    );
    DELETE FROM click_events WHERE listing_id IN (
      SELECT id FROM listings WHERE title LIKE '%SuperMicro%' OR title LIKE '%PromptMatrix%' OR title LIKE '%API Booster%' OR title LIKE '%CheckoutFast%' OR title LIKE '%Solopreneur OS%' OR title LIKE '%SaaS UX Conversion%' OR title LIKE '%BentoGrid%'
    );
    DELETE FROM listings WHERE title LIKE '%SuperMicro%' OR title LIKE '%PromptMatrix%' OR title LIKE '%API Booster%' OR title LIKE '%CheckoutFast%' OR title LIKE '%Solopreneur OS%' OR title LIKE '%SaaS UX Conversion%' OR title LIKE '%BentoGrid%';
  `);

  const fakeSeedIds = ['list_promptbase_ai', 'list_domain_checkout', 'list_notion_bundle', 'list_design_audit', 'list_tailwind_ui'];
  const placeholders = fakeSeedIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM bids WHERE listing_id IN (${placeholders})`).run(...fakeSeedIds);
  db.prepare(`DELETE FROM click_events WHERE listing_id IN (${placeholders})`).run(...fakeSeedIds);
  db.prepare(`DELETE FROM listings WHERE id IN (${placeholders})`).run(...fakeSeedIds);

  // If domainliq doesn't exist, create it with $10 bid
  const domainliqRow = db.prepare("SELECT id FROM listings WHERE buy_url LIKE '%domainliq.com%' OR title LIKE '%DomainLiq%'").get() as { id: string } | undefined;
  
  if (!domainliqRow) {
    db.prepare(`
      INSERT INTO listings (id, title, tagline, buy_url, image_url, price_tag, category, bid_amount, clicks_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'list_domainliq',
      'DomainLiq | Premium Domain Liquidation — $59 Flat & Bulk Portfolios',
      'Direct domain liquidation marketplace for single domains at $59 flat and wholesale portfolios',
      'https://domainliq.com',
      'https://www.google.com/s2/favicons?domain=domainliq.com&sz=128',
      '$59 flat',
      'domains-assets',
      10.00,
      0
    );

    db.prepare(`
      INSERT INTO bids (id, listing_id, amount, bidder_email)
      VALUES (?, ?, ?, ?)
    `).run(
      'bid_domainliq_seed',
      'list_domainliq',
      10.00,
      'support@domainliq.com'
    );
  } else {
    // Update existing row to clean title and $10 bid
    db.prepare(`
      UPDATE listings 
      SET bid_amount = 10.00, 
          title = 'DomainLiq | Premium Domain Liquidation — $59 Flat & Bulk Portfolios', 
          tagline = 'Direct domain liquidation marketplace for single domains at $59 flat and wholesale portfolios', 
          price_tag = '$59 flat', 
          category = 'domains-assets' 
      WHERE id = ?
    `).run(domainliqRow.id);
  }

  recalculateRanks();
}

/**
 * Recalculate ranks across all listings based on cumulative bid amount DESC, created_at ASC
 */
export function recalculateRanks(): void {
  const updateStmt = db.prepare(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY bid_amount DESC, created_at ASC) as new_rank
      FROM listings
    )
    UPDATE listings
    SET rank = (SELECT new_rank FROM ranked WHERE ranked.id = listings.id)
  `);

  updateStmt.run();
}

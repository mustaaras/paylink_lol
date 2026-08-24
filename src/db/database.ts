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
  const countRow = db.prepare('SELECT COUNT(*) as count FROM listings').get() as { count: number };
  if (countRow.count > 0) return;

  const sampleListings: Array<Omit<Listing, 'rank' | 'clicks_count' | 'created_at' | 'updated_at'>> = [
    {
      id: 'list_promptbase_ai',
      title: 'PromptMatrix AI',
      tagline: 'Automated multi-agent prompt optimization engine for production LLMs',
      buy_url: 'https://stripe.com',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=160&q=80',
      price_tag: '$49/mo',
      category: 'saas',
      bid_amount: 150.00
    },
    {
      id: 'list_domain_checkout',
      title: 'CheckoutFast.com',
      tagline: 'Ultra-premium brandable domain for 1-click payment gateways',
      buy_url: 'https://dan.com',
      image_url: 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=160&q=80',
      price_tag: '$2,850 buy-now',
      category: 'domain',
      bid_amount: 95.00
    },
    {
      id: 'list_notion_bundle',
      title: 'Solopreneur OS 2026',
      tagline: 'Complete Notion operating system for managing 6-figure micro-SaaS & digital products',
      buy_url: 'https://gumroad.com',
      image_url: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=160&q=80',
      price_tag: '$39 lifetime',
      category: 'digital',
      bid_amount: 60.00
    },
    {
      id: 'list_design_audit',
      title: 'SaaS UX Conversion Sprint',
      tagline: '48-hour ruthless landing page UI/UX audit guaranteed to double checkout conversion',
      buy_url: 'https://cal.com',
      image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=160&q=80',
      price_tag: '$499 sprint',
      category: 'service',
      bid_amount: 40.00
    },
    {
      id: 'list_tailwind_ui',
      title: 'BentoGrid Pro UI Kit',
      tagline: '60+ drop-in Tailwind CSS bento components and micro-interactions',
      buy_url: 'https://lemonsqueezy.com',
      image_url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=160&q=80',
      price_tag: '$29 copy',
      category: 'digital',
      bid_amount: 25.00
    }
  ];

  const insertListing = db.prepare(`
    INSERT INTO listings (id, title, tagline, buy_url, image_url, price_tag, category, bid_amount, clicks_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBid = db.prepare(`
    INSERT INTO bids (id, listing_id, amount, bidder_email)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const item of sampleListings) {
      insertListing.run(
        item.id,
        item.title,
        item.tagline,
        item.buy_url,
        item.image_url || null,
        item.price_tag || null,
        item.category,
        item.bid_amount,
        Math.floor(Math.random() * 85) + 12
      );

      insertBid.run(
        `bid_${item.id}_seed`,
        item.id,
        item.bid_amount,
        'creator@buylink.lol'
      );
    }
  });

  tx();
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

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { ListingService } from './services/listingService.js';
import { VisitorService } from './services/visitorService.js';
import { StripeService, stripe } from './services/stripeService.js';
import { TurnstileService } from './services/turnstileService.js';
import { SecurityService } from './services/securityService.js';
import { CreateListingInput, OutbidInput, OutbidNotification } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
initDatabase();

const app = express();
app.set('trust proxy', 1); // Trust Coolify / reverse proxy headers

const PORT = process.env.PORT || 3000;

function getBaseUrl(req: Request): string {
  // If explicitly configured in production env, use it
  if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  // Otherwise resolve from reverse proxy headers
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : (forwardedProto || req.protocol || 'https');
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || req.headers.host || 'paylink.lol');
  
  return `${protocol}://${host}`.replace(/\/$/, '');
}

// Maintain active SSE clients for real-time live feed
const sseClients = new Set<Response>();

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Keep-alive ping every 25 seconds for SSE
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 25000);

app.use(cors());

// Stripe Webhook needs RAW body
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig || !stripe) {
      console.warn('⚠️ Stripe webhook received without configured STRIPE_WEBHOOK_SECRET or Stripe client');
      res.status(400).json({ error: 'Stripe webhook secret not configured' });
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      try {
        const result = await StripeService.handleCompletedSession(session);
        
        // Broadcast real-time update to all connected users
        broadcastSSE('leaderboard_update', {
          listings: ListingService.getListings(),
          stats: ListingService.getStats(),
          notification: {
            type: result.type === 'create_listing' ? 'new_listing' : 'outbid',
            timestamp: new Date().toISOString(),
            listing: result.listing,
            previous_rank: result.previousRank,
            new_rank: result.newRank,
            bid_amount: result.amount,
            message: result.message
          }
        });
      } catch (err: any) {
        console.error('Error handling completed checkout session:', err);
      }
    }

    res.json({ received: true });
  }
);

// Standard JSON parsers for remaining endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Record visitor sessions in database
app.use((req: Request, res: Response, next) => {
  if (!req.path.startsWith('/css/') && !req.path.startsWith('/js/') && !req.path.endsWith('.svg') && !req.path.endsWith('.png') && !req.path.endsWith('.ico')) {
    VisitorService.recordVisit(req);
  }
  next();
});

// Serve static frontend assets
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Terms of Service page
app.get('/terms', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'terms.html'));
});

// Privacy Policy page
app.get('/privacy', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'privacy.html'));
});

// Platform Rules page
app.get('/rules', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'rules.html'));
});

// Admin Dashboard Page (Protected custom route)
app.get(['/aras/admin', '/aras/admin/'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public/admin.html'));
});

// Admin Authentication & Helper
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'paylink_admin_2026';
function getExpectedAdminToken() {
  return crypto.createHmac('sha256', ADMIN_PASSWORD).update('paylink_admin_session').digest('hex');
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-admin-token'] as string);
  const expectedToken = getExpectedAdminToken();

  if (token === expectedToken || req.headers['x-admin-password'] === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid Admin Password/Token' });
  }
}

// Admin: Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  const token = getExpectedAdminToken();
  res.json({ success: true, token });
});

// Admin: Get all listings
app.get('/api/admin/listings', requireAdmin, (req: Request, res: Response) => {
  const listings = ListingService.getListings();
  res.json(listings);
});

// Admin: Update a listing (category, title, URL, etc.)
app.put('/api/admin/listings/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = ListingService.updateListingAdmin(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  broadcastSSE('leaderboard_update', {
    listings: ListingService.getListings(),
    stats: ListingService.getStats(),
    notification: {
      type: 'rank_change',
      timestamp: new Date().toISOString(),
      listing: updated,
      previous_rank: updated.rank,
      new_rank: updated.rank,
      bid_amount: updated.bid_amount,
      message: `Listing "${updated.title}" updated by admin.`
    }
  });

  res.json({ success: true, listing: updated });
});

// Admin: Delete / Moderate a listing
app.delete('/api/admin/listings/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const deleted = ListingService.deleteListingAdmin(id);
  if (!deleted) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  broadcastSSE('leaderboard_update', {
    listings: ListingService.getListings(),
    stats: ListingService.getStats(),
    notification: {
      type: 'rank_change',
      timestamp: new Date().toISOString(),
      listing: undefined as any,
      previous_rank: 0,
      new_rank: 0,
      bid_amount: 0,
      message: `A listing was moderated/removed.`
    }
  });

  res.json({ success: true });
});

// Admin: Get extended system stats
app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const stats = ListingService.getStats();
  const recentBids = ListingService.getRecentOutbids(50);
  res.json({ stats, recentBids });
});

// Configuration info for frontend
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    isMock: StripeService.isMock(),
    minInitialBid: 0,
    minOutbidIncrement: Number(process.env.MIN_OUTBID_INCREMENT || 1),
    turnstileSiteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
  });
});

// Auto-fetch link metadata (title, tagline, icon/image)
app.get('/api/metadata', async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url) {
    res.status(400).json({ error: 'URL query parameter is required' });
    return;
  }

  // Pre-validate allowed platforms (blocks chat invites)
  const platformCheck = SecurityService.validateAllowedPlatform(url);
  if (!platformCheck.valid) {
    res.status(400).json({ error: platformCheck.error });
    return;
  }

  try {
    const { MetadataService } = await import('./services/metadataService.js');
    const meta = await MetadataService.fetchMetadata(url);
    res.json(meta);
  } catch (err: any) {
    console.error('Error fetching metadata:', err);
    res.status(400).json({ error: err.message || 'Failed to fetch metadata' });
  }
});

// Leaderboard Listings API
app.get('/api/listings', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const listings = ListingService.getListings(category);
  res.json(listings);
});

// Single Listing details
app.get('/api/listings/:id', (req: Request, res: Response) => {
  const listingId = req.params.id as string;
  const listing = ListingService.getListingById(listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  res.json(listing);
});

// Leaderboard aggregate stats
app.get('/api/stats', (req: Request, res: Response) => {
  const stats = ListingService.getStats();
  res.json(stats);
});

// Full Activity Stream
app.get('/api/activity', (req: Request, res: Response) => {
  const activity = ListingService.getRecentOutbids(25);
  res.json(activity);
});

// Recent outbids for live ticker
app.get('/api/ticker', (req: Request, res: Response) => {
  const recent = ListingService.getRecentOutbids(8);
  res.json(recent);
});

// Create Listing Checkout Session
app.post('/api/listings/create-checkout', async (req: Request, res: Response) => {
  try {
    const { title, tagline, buy_url, image_url, price_tag, category, bid_amount, bidder_email, turnstile_token } = req.body;

    if (!title || !tagline || !buy_url || !category || bid_amount === undefined) {
      res.status(400).json({ error: 'Missing required listing fields: title, tagline, buy_url, category, bid_amount' });
      return;
    }

    // Verify Cloudflare Turnstile token
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const turnstileCheck = await TurnstileService.verifyToken(turnstile_token, clientIp);
    if (!turnstileCheck.success) {
      res.status(403).json({ error: turnstileCheck.error || 'Bot verification failed' });
      return;
    }

    // Validate URL format
    if (!buy_url.startsWith('http://') && !buy_url.startsWith('https://')) {
      res.status(400).json({ error: 'buy_url must start with http:// or https://' });
      return;
    }

    // Automated Security & Spam Guards (Shortener Unmasking, Chat Filter, Keyword Blocklist, URL Health Check)
    const securityCheck = await SecurityService.sanitizeAndValidate(title, tagline, buy_url);
    if (!securityCheck.valid) {
      res.status(400).json({ error: securityCheck.error || 'Submission failed safety and spam verification.' });
      return;
    }

    const input: CreateListingInput = {
      title: title.trim(),
      tagline: tagline.trim(),
      buy_url: securityCheck.finalUrl,
      image_url: image_url ? image_url.trim() : undefined,
      price_tag: price_tag ? price_tag.trim() : undefined,
      category,
      bid_amount: isNaN(parseFloat(bid_amount)) ? 0 : Math.max(0, parseFloat(bid_amount)),
      bidder_email: bidder_email ? bidder_email.trim() : undefined
    };

    // Free listing ($0 bid) - publish immediately without payment
    if (input.bid_amount <= 0) {
      const created = ListingService.createListing(input);
      
      broadcastSSE('leaderboard_update', {
        listings: ListingService.getListings(),
        stats: ListingService.getStats(),
        notification: {
          type: 'new_listing',
          timestamp: new Date().toISOString(),
          listing: created,
          previous_rank: undefined,
          new_rank: created.rank,
          bid_amount: 0,
          message: `🆕 Free link "${created.title}" posted!`
        }
      });

      res.json({
        free: true,
        success: true,
        listing: created
      });
      return;
    }

    const checkout = await StripeService.createListingCheckout(input, getBaseUrl(req));
    res.json(checkout);
  } catch (err: any) {
    console.error('Error creating listing checkout:', err);
    res.status(400).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// Outbid Existing Listing Checkout Session
app.post('/api/listings/:id/outbid-checkout', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const { amount, bidder_email, turnstile_token } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      res.status(400).json({ error: 'A valid numeric outbid amount is required' });
      return;
    }

    // Verify Cloudflare Turnstile token
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const turnstileCheck = await TurnstileService.verifyToken(turnstile_token, clientIp);
    if (!turnstileCheck.success) {
      res.status(403).json({ error: turnstileCheck.error || 'Bot verification failed' });
      return;
    }

    const input: OutbidInput = {
      listing_id: listingId,
      amount: parseFloat(amount),
      bidder_email: bidder_email || undefined
    };

    const checkout = await StripeService.createOutbidCheckout(input, getBaseUrl(req));
    res.json(checkout);
  } catch (err: any) {
    console.error('Error creating outbid checkout:', err);
    res.status(400).json({ error: err.message || 'Failed to create outbid session' });
  }
});

// Dev Simulation Checkout Completion
app.get('/dev-complete-checkout', (req: Request, res: Response) => {
  try {
    const { type, data, sessionId } = req.query;
    if (!type || !data) {
      res.redirect('/?error=Invalid+dev+checkout+parameters');
      return;
    }

    const parsedData = JSON.parse(decodeURIComponent(data as string));

    if (type === 'create') {
      const listing = ListingService.createListing(parsedData, sessionId as string);
      
      broadcastSSE('leaderboard_update', {
        listings: ListingService.getListings(),
        stats: ListingService.getStats(),
        notification: {
          type: 'new_listing',
          timestamp: new Date().toISOString(),
          listing,
          new_rank: listing.rank,
          bid_amount: listing.bid_amount,
          message: `🚀 "${listing.title}" listed at #${listing.rank} ($${listing.bid_amount.toFixed(2)})!`
        }
      });

      res.redirect(`/?success=true&listing_id=${listing.id}&title=${encodeURIComponent(listing.title)}`);
    } else if (type === 'outbid') {
      const result = ListingService.outbidListing(parsedData, sessionId as string);

      broadcastSSE('leaderboard_update', {
        listings: ListingService.getListings(),
        stats: ListingService.getStats(),
        notification: {
          type: 'outbid',
          timestamp: new Date().toISOString(),
          listing: result.listing,
          previous_rank: result.previousRank,
          new_rank: result.newRank,
          bid_amount: result.amount,
          message: `⚡ "${result.listing.title}" boosted by +$${result.amount.toFixed(2)} to #${result.newRank}!`
        }
      });

      res.redirect(`/?outbid_success=true&listing_id=${result.listing.id}&title=${encodeURIComponent(result.listing.title)}&rank=${result.newRank}`);
    } else {
      res.redirect('/?error=Unknown+checkout+type');
    }
  } catch (err: any) {
    console.error('Error completing dev checkout:', err);
    res.redirect(`/?error=${encodeURIComponent(err.message || 'Checkout failed')}`);
  }
});

// Server-Sent Events (SSE) Live Feed endpoint
app.get('/api/live-feed', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  VisitorService.registerClient(res);

  // Send initial data to connecting client
  const initialPayload = {
    listings: ListingService.getListings(),
    stats: ListingService.getStats(),
    recentOutbids: ListingService.getRecentOutbids(8)
  };
  res.write(`event: connected\ndata: ${JSON.stringify(initialPayload)}\n\n`);

  // Broadcast updated visitor count to all clients
  broadcastSSE('visitors_update', {
    active_visitors: VisitorService.getActiveCount()
  });

  req.on('close', () => {
    sseClients.delete(res);
    VisitorService.unregisterClient(res);
    broadcastSSE('visitors_update', {
      active_visitors: VisitorService.getActiveCount()
    });
  });
});

// Outbound Link Click Analytics & 302 Redirection
app.get('/go/:id', (req: Request, res: Response) => {
  const listingId = req.params.id as string;
  const referrer = (req.get('Referrer') || req.get('Referer') || '') as string;
  const ip = req.ip || req.socket.remoteAddress || '';

  const targetUrl = ListingService.recordClick(listingId, referrer, ip);

  if (!targetUrl) {
    res.status(404).send('Listing not found');
    return;
  }

  // Broadcast click counter increment
  broadcastSSE('click_update', {
    listing_id: listingId,
    stats: ListingService.getStats()
  });

  res.redirect(302, targetUrl);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Fallback to index.html for root or SPA paths
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public/index.html'));
});

// Start Server
export const server = app.listen(PORT, () => {
  console.log(`🚀 PayLink server running at http://localhost:${PORT}`);
  console.log(`⚡ "You pay, you rank." Live Feed active at http://localhost:${PORT}/api/live-feed`);
  console.log(`💳 Stripe Mode: ${StripeService.isMock() ? 'SIMULATION / DEV MOCK' : 'LIVE STRIPE'}`);
});

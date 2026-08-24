import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { ListingService } from './services/listingService.js';
import { VisitorService } from './services/visitorService.js';
import { StripeService, stripe } from './services/stripeService.js';
import { CreateListingInput, OutbidInput, OutbidNotification } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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

// Configuration info for frontend
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    isMock: StripeService.isMock(),
    minInitialBid: 0,
    minOutbidIncrement: Number(process.env.MIN_OUTBID_INCREMENT || 1)
  });
});

// Auto-fetch link metadata (title, tagline, icon/image)
app.get('/api/metadata', async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url) {
    res.status(400).json({ error: 'URL query parameter is required' });
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
    const { title, tagline, buy_url, image_url, price_tag, category, bid_amount, bidder_email } = req.body;

    if (!title || !tagline || !buy_url || !category || bid_amount === undefined) {
      res.status(400).json({ error: 'Missing required listing fields: title, tagline, buy_url, category, bid_amount' });
      return;
    }

    // Validate URL format
    if (!buy_url.startsWith('http://') && !buy_url.startsWith('https://')) {
      res.status(400).json({ error: 'buy_url must start with http:// or https://' });
      return;
    }

    const input: CreateListingInput = {
      title,
      tagline,
      buy_url,
      image_url: image_url || undefined,
      price_tag: price_tag || undefined,
      category,
      bid_amount: isNaN(parseFloat(bid_amount)) ? 0 : Math.max(0, parseFloat(bid_amount)),
      bidder_email: bidder_email || undefined
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

    const checkout = await StripeService.createListingCheckout(input, BASE_URL);
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
    const { amount, bidder_email } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      res.status(400).json({ error: 'A valid numeric outbid amount is required' });
      return;
    }

    const input: OutbidInput = {
      listing_id: listingId,
      amount: parseFloat(amount),
      bidder_email: bidder_email || undefined
    };

    const checkout = await StripeService.createOutbidCheckout(input, BASE_URL);
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

import Stripe from 'stripe';
import { CreateListingInput, OutbidInput, Listing } from '../types/index.js';
import { ListingService } from './listingService.js';
import { nanoid } from 'nanoid';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const isMockMode = process.env.DEV_MOCK_PAYMENTS === 'true' || !stripeSecretKey;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27.acacia' as any
    })
  : null;

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  isMock: boolean;
}

export class StripeService {
  static isMock(): boolean {
    return isMockMode || !stripe;
  }

  /**
   * Create checkout session for a brand-new listing
   */
  static async createListingCheckout(
    input: CreateListingInput,
    baseUrl: string
  ): Promise<CheckoutResult> {
    const minBid = Number(process.env.MIN_INITIAL_BID || 1);
    if (input.bid_amount < minBid) {
      throw new Error(`Minimum initial bid is $${minBid}`);
    }

    if (this.isMock()) {
      // Dev simulation mode: simulate instant completion or mock checkout redirect
      const sessionId = `mock_sess_${nanoid(16)}`;
      const checkoutUrl = `${baseUrl}/dev-complete-checkout?sessionId=${sessionId}&type=create&data=${encodeURIComponent(
        JSON.stringify(input)
      )}`;

      return {
        sessionId,
        checkoutUrl,
        isMock: true
      };
    }

    // Live Stripe Checkout Session
    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `PayLink Leaderboard Rank: ${input.title}`,
              description: input.tagline,
              images: input.image_url ? [input.image_url] : undefined
            },
            unit_amount: Math.round(input.bid_amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: input.bidder_email,
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&success=true&listing_id=${encodeURIComponent(
        input.title
      )}`,
      cancel_url: `${baseUrl}/?canceled=true`,
      metadata: {
        action: 'create_listing',
        title: input.title,
        tagline: input.tagline,
        buy_url: input.buy_url,
        image_url: input.image_url || '',
        price_tag: input.price_tag || '',
        category: input.category,
        bid_amount: input.bid_amount.toString(),
        bidder_email: input.bidder_email || ''
      }
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url || baseUrl,
      isMock: false
    };
  }

  /**
   * Create checkout session for outbidding an existing listing
   */
  static async createOutbidCheckout(
    input: OutbidInput,
    baseUrl: string
  ): Promise<CheckoutResult> {
    const listing = ListingService.getListingById(input.listing_id);
    if (!listing) {
      throw new Error(`Listing not found: ${input.listing_id}`);
    }

    const minIncrement = Number(process.env.MIN_OUTBID_INCREMENT || 1);
    if (input.amount < minIncrement) {
      throw new Error(`Minimum outbid increment is $${minIncrement}`);
    }

    if (this.isMock()) {
      const sessionId = `mock_sess_${nanoid(16)}`;
      const checkoutUrl = `${baseUrl}/dev-complete-checkout?sessionId=${sessionId}&type=outbid&data=${encodeURIComponent(
        JSON.stringify(input)
      )}`;

      return {
        sessionId,
        checkoutUrl,
        isMock: true
      };
    }

    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `PayLink Rank Boost: #${listing.rank} ${listing.title}`,
              description: `Add +$${input.amount} to boost ranking on paylink.lol (You pay, you rank.)`
            },
            unit_amount: Math.round(input.amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: input.bidder_email,
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&outbid_success=true&listing_id=${listing.id}`,
      cancel_url: `${baseUrl}/?canceled=true`,
      metadata: {
        action: 'outbid_listing',
        listing_id: input.listing_id,
        amount: input.amount.toString(),
        bidder_email: input.bidder_email || ''
      }
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url || baseUrl,
      isMock: false
    };
  }

  /**
   * Process completed Stripe Checkout Session
   */
  static async handleCompletedSession(session: Stripe.Checkout.Session): Promise<{
    type: 'create_listing' | 'outbid_listing';
    listing: Listing;
    previousRank?: number;
    newRank?: number;
    amount: number;
    message: string;
  }> {
    const metadata = session.metadata || {};
    const action = metadata.action;

    if (action === 'create_listing') {
      const input: CreateListingInput = {
        title: metadata.title,
        tagline: metadata.tagline,
        buy_url: metadata.buy_url,
        image_url: metadata.image_url || undefined,
        price_tag: metadata.price_tag || undefined,
        category: metadata.category as any,
        bid_amount: parseFloat(metadata.bid_amount),
        bidder_email: metadata.bidder_email || session.customer_details?.email || undefined
      };

      const listing = ListingService.createListing(input, session.id);
      return {
        type: 'create_listing',
        listing,
        newRank: listing.rank,
        amount: input.bid_amount,
        message: `🚀 "${listing.title}" entered the leaderboard at #${listing.rank} ($${listing.bid_amount.toFixed(2)})`
      };
    } else if (action === 'outbid_listing') {
      const input: OutbidInput = {
        listing_id: metadata.listing_id,
        amount: parseFloat(metadata.amount),
        bidder_email: metadata.bidder_email || session.customer_details?.email || undefined
      };

      const result = ListingService.outbidListing(input, session.id);
      return {
        type: 'outbid_listing',
        listing: result.listing,
        previousRank: result.previousRank,
        newRank: result.newRank,
        amount: result.amount,
        message: `⚡ "${result.listing.title}" was boosted by +$${result.amount.toFixed(2)} to #${result.newRank} (Total: $${result.listing.bid_amount.toFixed(2)})`
      };
    }

    throw new Error(`Unknown session action: ${action}`);
  }
}

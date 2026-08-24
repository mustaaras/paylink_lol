export type Category =
  | 'all'
  | 'ai-agents'
  | 'seo-ai'
  | 'marketing'
  | 'crypto-web3'
  | 'devtools'
  | 'business-finance'
  | 'security-privacy'
  | 'health-wellness'
  | 'social-creator'
  | 'leaderboards'
  | 'hiring-jobs'
  | 'education'
  | 'agencies-services'
  | 'ecommerce'
  | 'domains-assets'
  | 'games-entertainment'
  | 'people-profiles'
  | 'productivity'
  | 'design-creative'
  | 'writing-content'
  | 'directories-launch'
  | 'ai-media'
  | 'audio-voice'
  | 'sales-leads'
  | 'travel-lifestyle'
  | 'real-estate'
  | 'media-news'
  | 'other'
  | string;

export interface Listing {
  id: string;
  title: string;
  tagline: string;
  buy_url: string;
  image_url?: string | null;
  price_tag?: string | null;
  category: Category;
  bid_amount: number;
  rank: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  listing_id: string;
  stripe_session_id?: string | null;
  amount: number;
  bidder_email?: string | null;
  created_at: string;
}

export interface ClickEvent {
  id?: number;
  listing_id: string;
  referrer?: string | null;
  ip_hash?: string | null;
  created_at: string;
}

export interface CreateListingInput {
  title: string;
  tagline: string;
  buy_url: string;
  image_url?: string;
  price_tag?: string;
  category: Category;
  bid_amount: number;
  bidder_email?: string;
}

export interface OutbidInput {
  listing_id: string;
  amount: number;
  bidder_email?: string;
}

export interface OutbidNotification {
  type: 'outbid' | 'new_listing' | 'rank_update';
  timestamp: string;
  listing: Listing;
  previous_rank?: number;
  new_rank?: number;
  bid_amount: number;
  message: string;
}

export interface LeaderboardStats {
  total_volume_usd: number;
  total_listings: number;
  total_clicks: number;
  top_bid: number;
  active_visitors: number;
}

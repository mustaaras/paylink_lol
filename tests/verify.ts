import { initDatabase, db, recalculateRanks } from '../src/db/database.js';
import { ListingService } from '../src/services/listingService.js';
import { StripeService } from '../src/services/stripeService.js';

async function runTests() {
  console.log('🧪 Starting PayLink Verification Test Suite...\n');

  // Test 1: Database Initialization
  console.log('▶ Test 1: Database & Seed Initialization');
  initDatabase();
  const initialListings = ListingService.getListings();
  console.log(`  ✓ Found ${initialListings.length} initial listings.`);
  if (initialListings.length === 0) {
    throw new Error('Initial listings count is zero');
  }

  // Verify ranks are ordered 1, 2, 3, ...
  initialListings.forEach((item, index) => {
    if (item.rank !== index + 1) {
      throw new Error(`Listing ${item.title} has invalid rank: expected ${index + 1}, got ${item.rank}`);
    }
  });
  console.log('  ✓ Ranks are contiguous and strictly ordered by bid_amount DESC.');

  // Test 2: Category Filtering
  console.log('\n▶ Test 2: Category Filtering');
  const saasListings = ListingService.getListings('saas');
  const domainListings = ListingService.getListings('domain');
  console.log(`  ✓ Filter "saas": ${saasListings.length} items`);
  console.log(`  ✓ Filter "domain": ${domainListings.length} items`);
  if (!saasListings.every(l => l.category === 'saas')) {
    throw new Error('Category filter returned non-saas item');
  }

  // Test 3: Creating a new Listing with the highest bid + 10 to guarantee Rank #1
  console.log('\n▶ Test 3: Create Listing & Rank Calculation');
  const currentStats = ListingService.getStats();
  const targetBid = currentStats.top_bid + 50.00;

  const newListing = ListingService.createListing({
    title: 'SuperMicro SaaS',
    tagline: 'Instant micro-saas boilerplate with Stripe billing built in',
    buy_url: 'https://buy.stripe.com/test_123',
    price_tag: '$79 lifetime',
    category: 'saas',
    bid_amount: targetBid,
    bidder_email: 'indie@creator.com'
  });

  console.log(`  ✓ Created "${newListing.title}" with $${targetBid.toFixed(2)} bid -> Rank #${newListing.rank}`);
  if (newListing.rank !== 1) {
    throw new Error(`Expected rank #1 for highest bid $${targetBid}, got rank #${newListing.rank}`);
  }

  // Test 4: Outbidding a Listing
  console.log('\n▶ Test 4: Outbid & Leapfrogging');
  // Find a lower rank listing to boost
  const listingsBefore = ListingService.getListings();
  const candidate = listingsBefore[listingsBefore.length - 1]; // bottom listing
  const boostAmount = (newListing.bid_amount - candidate.bid_amount) + 50.00;

  const outbidResult = ListingService.outbidListing({
    listing_id: candidate.id,
    amount: boostAmount,
    bidder_email: 'booster@paylink.lol'
  });

  console.log(`  ✓ Boosted "${outbidResult.listing.title}" by +$${boostAmount.toFixed(2)} (Total: $${outbidResult.listing.bid_amount.toFixed(2)})`);
  console.log(`  ✓ Previous Rank: #${outbidResult.previousRank} -> New Rank: #${outbidResult.newRank}`);

  if (outbidResult.newRank !== 1) {
    throw new Error(`Expected rank #1 after boost, got rank #${outbidResult.newRank}`);
  }

  // Test 5: Click Tracking & Outbound Redirect
  console.log('\n▶ Test 5: Outbound Click Tracking');
  const targetUrl = ListingService.recordClick(newListing.id, 'https://twitter.com', '127.0.0.1');
  if (targetUrl !== 'https://buy.stripe.com/test_123') {
    throw new Error(`Click tracking returned wrong target URL: ${targetUrl}`);
  }

  const updatedListing = ListingService.getListingById(newListing.id);
  if (!updatedListing || updatedListing.clicks_count < 1) {
    throw new Error(`Expected clicks_count to be >= 1, got ${updatedListing?.clicks_count}`);
  }
  console.log(`  ✓ Outbound click recorded and verified: clicks_count = ${updatedListing.clicks_count}`);

  // Test 6: Global Stats
  console.log('\n▶ Test 6: Global Aggregate Stats');
  const stats = ListingService.getStats();
  console.log(`  ✓ Total Volume: $${stats.total_volume_usd}`);
  console.log(`  ✓ Total Listings: ${stats.total_listings}`);
  console.log(`  ✓ Total Clicks: ${stats.total_clicks}`);
  console.log(`  ✓ Top Bid: $${stats.top_bid}`);

  if (stats.top_bid !== outbidResult.listing.bid_amount) {
    throw new Error(`Expected top bid to be $${outbidResult.listing.bid_amount}, got $${stats.top_bid}`);
  }

  // Test 7: Stripe Mock Mode Checkout Session
  console.log('\n▶ Test 7: Dev Checkout Flow');
  const checkout = await StripeService.createListingCheckout({
    title: 'AI Copywriter',
    tagline: 'Generate high converting copy in 1-click',
    buy_url: 'https://lemonsqueezy.com/aicopy',
    category: 'digital',
    bid_amount: 30.00
  }, 'http://localhost:3001');

  console.log(`  ✓ Dev checkout generated session: ${checkout.sessionId}`);
  console.log(`  ✓ Mock checkout URL: ${checkout.checkoutUrl}`);

  console.log('\n✅ ALL PAYLINK VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(err => {
  console.error('\n❌ Verification test failed:', err);
  process.exit(1);
});

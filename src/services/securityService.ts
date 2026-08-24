/**
 * In-App Automated Security & Spam Guards for paylink.lol
 * 
 * 1. Link Shortener & Cloak Detection (Unmasks bit.ly, tinyurl, etc. to real destination)
 * 2. Invite & Private Chat Filtering (Blocks Telegram, WhatsApp, Discord, Signal group chat links)
 * 3. Keyword & Phishing Blocklist (Blocks adult/NSFW, scams, phishing triggers)
 * 4. Server-Side URL Health Check (Ensures link is live with HTTP 200-399, not a dead/parked page)
 */

const PROHIBITED_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'cutt.ly',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'rb.gy',
  'shorturl.at',
  'rebrand.ly',
  'snip.ly',
  'v.gd',
  'clck.ru',
  'goo.gl'
];

const PROHIBITED_CHAT_DOMAINS = [
  't.me',
  'telegram.me',
  'chat.whatsapp.com',
  'wa.me',
  'discord.gg',
  'discord.com/invite',
  'signal.group',
  'signal.me',
  'm.me'
];

const DISALLOWED_KEYWORDS = [
  'porn',
  'xxx',
  'nsfw',
  'nude',
  'sex',
  'escort',
  'onlyfans',
  'fansly',
  'hentai',
  'casino',
  'betting',
  'gambling',
  'drainer',
  'phishing',
  'free-robux',
  'free-vbucks',
  'carding'
];

export class SecurityService {
  /**
   * 1. Detect and resolve link shorteners to their real destination URL
   */
  static async resolveFinalUrl(rawUrl: string): Promise<string> {
    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

      const isShortener = PROHIBITED_SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s));
      if (!isShortener) {
        return rawUrl;
      }

      // Fast resolve redirect
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(rawUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (paylink-bot/1.0; +https://paylink.lol)'
        }
      });

      clearTimeout(timeoutId);

      if (res.url && res.url !== rawUrl) {
        return res.url;
      }
      return rawUrl;
    } catch {
      return rawUrl;
    }
  }

  /**
   * 2. Validate against prohibited invite / private chat links
   */
  static validateAllowedPlatform(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const fullPath = (hostname + parsed.pathname).toLowerCase();

      const isChatInvite = PROHIBITED_CHAT_DOMAINS.some(chatDomain => {
        return hostname === chatDomain || hostname.endsWith('.' + chatDomain) || fullPath.includes(chatDomain);
      });

      if (isChatInvite) {
        return {
          valid: false,
          error: 'Chat and group invite links (Telegram, WhatsApp, Discord, Signal) are not allowed. paylink.lol is for products, apps, websites, tools, and creator profiles.'
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * 3. Validate against adult / NSFW / scam / phishing keyword triggers
   */
  static validateContentSafety(title: string, tagline: string, url: string): { valid: boolean; error?: string } {
    const combined = `${title} ${tagline} ${url}`.toLowerCase();

    for (const keyword of DISALLOWED_KEYWORDS) {
      // Word boundary or containment check
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(combined) || combined.includes(keyword)) {
        return {
          valid: false,
          error: `Content or link violates platform safety rules (flagged keyword: "${keyword}"). Adult/NSFW and scam links are strictly prohibited.`
        };
      }
    }

    return { valid: true };
  }

  /**
   * 4. Server-Side URL Health Check (Ensures website is live with status 200-399)
   */
  static async verifyUrlHealth(url: string): Promise<{ alive: boolean; status?: number; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      // Attempt fast HEAD check
      let res: globalThis.Response;
      try {
        res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (paylink-health-checker/1.0; +https://paylink.lol)'
          }
        });
      } catch {
        // Fallback to lightweight GET if HEAD is refused
        res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (paylink-health-checker/1.0; +https://paylink.lol)'
          }
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.status >= 200 && res.status < 400) {
        return { alive: true, status: res.status };
      }

      // Cloudflare/bot challenge 403 is still an active live site
      if (res.status === 403) {
        return { alive: true, status: res.status };
      }

      return {
        alive: false,
        status: res.status,
        error: `Submitted website returned HTTP ${res.status}. Please make sure your website is publicly online.`
      };
    } catch (err: any) {
      // In local dev without internet, gracefully pass
      if (process.env.NODE_ENV === 'development' || process.env.DEV_MOCK_PAYMENTS === 'true') {
        return { alive: true };
      }
      return {
        alive: false,
        error: 'Unable to reach the destination URL. Please verify your domain and SSL configuration.'
      };
    }
  }

  /**
   * Complete All-in-One Security & Spam Guard
   */
  static async sanitizeAndValidate(title: string, tagline: string, rawUrl: string): Promise<{
    valid: boolean;
    finalUrl: string;
    error?: string;
  }> {
    // 1. Resolve shorteners
    const resolvedUrl = await this.resolveFinalUrl(rawUrl);

    // 2. Chat & Invite Platform validation
    const platformCheck = this.validateAllowedPlatform(resolvedUrl);
    if (!platformCheck.valid) {
      return { valid: false, finalUrl: resolvedUrl, error: platformCheck.error };
    }

    // 3. Keyword and phishing check
    const contentCheck = this.validateContentSafety(title, tagline, resolvedUrl);
    if (!contentCheck.valid) {
      return { valid: false, finalUrl: resolvedUrl, error: contentCheck.error };
    }

    // 4. Server-Side Health check
    const healthCheck = await this.verifyUrlHealth(resolvedUrl);
    if (!healthCheck.alive) {
      return { valid: false, finalUrl: resolvedUrl, error: healthCheck.error };
    }

    return {
      valid: true,
      finalUrl: resolvedUrl
    };
  }
}

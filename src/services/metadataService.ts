export interface ExtractedMetadata {
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  faviconUrl: string | null;
}

export class MetadataService {
  /**
   * Fetch a URL and extract open graph / meta tags / title / favicons
   */
  static async fetchMetadata(targetUrl: string): Promise<ExtractedMetadata> {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      throw new Error('Invalid URL format');
    }

    const domain = parsedUrl.hostname;
    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    let html = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PayLinkBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Read only first 250KB to keep it extremely fast
        const text = await response.text();
        html = text.substring(0, 250000);
      }
    } catch (err: any) {
      console.warn(`Could not scrape ${cleanUrl}: ${err.message}. Using domain fallbacks.`);
    }

    // Extract Title
    let title = '';
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
    const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i);
    const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);

    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else if (twitterTitleMatch && twitterTitleMatch[1]) {
      title = twitterTitleMatch[1].trim();
    } else if (titleTagMatch && titleTagMatch[1]) {
      title = titleTagMatch[1].trim();
    } else {
      // Fallback domain as title (e.g. mysaas.com)
      title = domain.replace(/^www\./, '');
    }

    // Clean html entities in title
    title = decodeHtmlEntities(title);

    // Extract Description / Tagline
    let description = '';
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i);
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
                          html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
    const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);

    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1].trim();
    } else if (metaDescMatch && metaDescMatch[1]) {
      description = metaDescMatch[1].trim();
    } else if (twitterDescMatch && twitterDescMatch[1]) {
      description = twitterDescMatch[1].trim();
    } else {
      description = `Direct link to ${title}`;
    }

    description = decodeHtmlEntities(description);

    // Extract Image or Favicon
    let imageUrl: string | null = null;
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                         html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
    const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      imageUrl = resolveUrl(ogImageMatch[1].trim(), cleanUrl);
    } else if (twitterImageMatch && twitterImageMatch[1]) {
      imageUrl = resolveUrl(twitterImageMatch[1].trim(), cleanUrl);
    }

    // Best favicon/icon
    let faviconUrl = defaultFavicon;
    const iconMatch = html.match(/<link\s+rel=["'](?:shortcut\s+)?icon["']\s+href=["'](.*?)["']/i) ||
                      html.match(/<link\s+href=["'](.*?)["']\s+rel=["'](?:shortcut\s+)?icon["']/i) ||
                      html.match(/<link\s+rel=["']apple-touch-icon["']\s+href=["'](.*?)["']/i);

    if (iconMatch && iconMatch[1]) {
      const resolvedIcon = resolveUrl(iconMatch[1].trim(), cleanUrl);
      if (resolvedIcon) faviconUrl = resolvedIcon;
    }

    return {
      url: cleanUrl,
      title: title.substring(0, 70),
      description: description.substring(0, 140),
      imageUrl: imageUrl || faviconUrl,
      faviconUrl: faviconUrl
    };
  }
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string | null {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

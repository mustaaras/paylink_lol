import { Response } from 'express';

export class VisitorService {
  private static activeClients = new Set<Response>();
  private static simulatedBaseline = 12; // Realistic baseline when running in dev
  private static cloudflareCache: { count: number; lastFetched: number } | null = null;

  static registerClient(client: Response) {
    this.activeClients.add(client);
  }

  static unregisterClient(client: Response) {
    this.activeClients.delete(client);
  }

  static getActiveCount(): number {
    const rawConnected = this.activeClients.size;
    // When Cloudflare token is provided, use Cloudflare Real-Time Analytics
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
      if (this.cloudflareCache && (Date.now() - this.cloudflareCache.lastFetched < 60000)) {
        return this.cloudflareCache.count;
      }
      // Async refresh Cloudflare analytics
      this.fetchCloudflareVisitors().catch(() => {});
      return this.cloudflareCache ? this.cloudflareCache.count : rawConnected;
    }

    // Dev/Real-time mode: connected SSE clients + active baseline
    return Math.max(1, rawConnected);
  }

  /**
   * Fetch real-time active visitors from Cloudflare GraphQL Analytics API
   */
  private static async fetchCloudflareVisitors(): Promise<number> {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!token || !zoneId) return this.activeClients.size;

    try {
      // Query Cloudflare GraphQL for active requests in the last 5 minutes
      const query = `
        query GetActiveVisitors($zoneTag: string) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              httpRequests1mGroups(limit: 5, filter: { datetime_geq: "${new Date(Date.now() - 5 * 60 * 1000).toISOString()}" }) {
                sum {
                  requests
                  pageViews
                }
                dimensions {
                  datetime
                }
              }
            }
          }
        }
      `;

      const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: { zoneTag: zoneId }
        })
      });

      const json = await res.json() as any;
      const groups = json?.data?.viewer?.zones?.[0]?.httpRequests1mGroups || [];
      const totalPageViews = groups.reduce((acc: number, g: any) => acc + (g.sum?.pageViews || 0), 0);
      
      const count = Math.max(1, Math.round(totalPageViews / 5));
      this.cloudflareCache = { count, lastFetched: Date.now() };
      return count;
    } catch (err) {
      console.warn('Could not fetch Cloudflare visitors:', err);
      return this.activeClients.size;
    }
  }
}

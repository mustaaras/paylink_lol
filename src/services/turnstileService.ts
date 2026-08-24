export class TurnstileService {
  /**
   * Verify Cloudflare Turnstile token (smooth development bypass on localhost)
   */
  static async verifyToken(token?: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MOCK_PAYMENTS === 'true' || !secretKey;

    // If Turnstile secret key is not configured, allow seamlessly
    if (!secretKey) {
      return { success: true };
    }

    if (!token) {
      if (isDev) {
        console.log('ℹ️ [Dev Mode] Turnstile token omitted — bypassed for localhost development.');
        return { success: true };
      }
      return { success: false, error: 'Cloudflare Turnstile verification token missing' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const outcome = await res.json() as { success: boolean; 'error-codes'?: string[] };
      if (outcome.success) {
        return { success: true };
      }

      // If in dev mode and verification failed (e.g. domain mismatch on localhost), allow local dev
      if (isDev) {
        console.warn('⚠️ [Dev Mode] Turnstile check returned failure but bypassed for localhost:', outcome['error-codes']);
        return { success: true };
      }

      console.warn('⚠️ Cloudflare Turnstile verification failed:', outcome['error-codes']);
      return {
        success: false,
        error: `Bot check failed: ${(outcome['error-codes'] || ['invalid-token']).join(', ')}`
      };
    } catch (err: any) {
      console.error('Error verifying Cloudflare Turnstile challenge:', err);
      if (isDev) {
        return { success: true };
      }
      return { success: false, error: 'Turnstile verification service unavailable' };
    }
  }
}

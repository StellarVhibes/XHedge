/**
 * Privacy-first analytics module
 *
 * Tracks key user actions with full privacy respect:
 * - Respects browser's doNotTrack setting
 * - Respects user's opt-out preference in localStorage
 * - Never sends wallet addresses or personal identifiable information
 * - Uses hashed identifiers instead of raw addresses
 */

const ANALYTICS_KEY = 'xhedge-analytics-enabled';
const ANALYTICS_PROVIDER = 'https://analytics.example.com'; // Replace with actual provider

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: number;
}

/**
 * Check if analytics is enabled based on:
 * 1. Browser's doNotTrack setting
 * 2. User's localStorage opt-out preference
 */
function isAnalyticsEnabled(): boolean {
  // Check doNotTrack browser setting
  const doNotTrack = navigator.doNotTrack || (window as any).doNotTrack;
  if (doNotTrack === '1' || doNotTrack === 'yes') {
    return false;
  }

  // Check localStorage opt-out
  try {
    const analyticsDisabled = localStorage.getItem(ANALYTICS_KEY);
    if (analyticsDisabled === 'false') {
      return false;
    }
  } catch {
    // localStorage may not be available
  }

  return true;
}

/**
 * Create a deterministic hash of a value for identification
 * without storing personally identifiable information
 */
function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get or create a session ID (persisted in sessionStorage)
 */
function getSessionId(): string {
  const key = 'xhedge-session-id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 11);
    try {
      sessionStorage.setItem(key, sessionId);
    } catch {
      // sessionStorage may not be available
    }
  }
  return sessionId;
}

/**
 * Track an analytics event
 *
 * @param eventName - Name of the event (e.g., 'wallet_connected')
 * @param properties - Optional event properties (must not contain PII)
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const event: AnalyticsEvent = {
    eventName,
    properties: {
      ...properties,
      // Add standard properties
      url: window.location.pathname,
      referrer: document.referrer || 'direct',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  // Add session ID but not user-identifying info
  try {
    const payload = {
      ...event,
      sessionId: getSessionId(),
    };

    // Send to analytics provider
    // Using a simple implementation - can be replaced with Plausible or Umami client library
    if (ANALYTICS_PROVIDER && ANALYTICS_PROVIDER !== 'https://analytics.example.com') {
      await fetch(`${ANALYTICS_PROVIDER}/api/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail - analytics errors should not break the app
      });
    }
  } catch {
    // Silently fail
  }
}

/**
 * Track wallet connection event
 */
export function trackWalletConnected(network?: string): void {
  trackEvent('wallet_connected', {
    network: network || 'unknown',
  });
}

/**
 * Track wallet disconnection event
 */
export function trackWalletDisconnected(): void {
  trackEvent('wallet_disconnected');
}

/**
 * Track deposit submission
 */
export function trackDepositSubmitted(amount?: string, asset?: string): void {
  trackEvent('deposit_submitted', {
    asset: asset || 'unknown',
    // Don't send actual amount - too identifiable
    hasAmount: !!amount && amount !== '0',
  });
}

/**
 * Track withdrawal submission
 */
export function trackWithdrawSubmitted(amount?: string, asset?: string): void {
  trackEvent('withdraw_submitted', {
    asset: asset || 'unknown',
    // Don't send actual amount - too identifiable
    hasAmount: !!amount && amount !== '0',
  });
}

/**
 * Track governance vote
 */
export function trackVoteCast(proposalType?: string, vote?: 'for' | 'against'): void {
  trackEvent('vote_cast', {
    proposalType: proposalType || 'unknown',
    vote: vote || 'unknown',
  });
}

/**
 * Track language change
 */
export function trackLanguageChanged(language?: string): void {
  trackEvent('language_changed', {
    language: language || 'unknown',
  });
}

/**
 * Track network switch
 */
export function trackNetworkSwitched(network?: string): void {
  trackEvent('network_switched', {
    network: network || 'unknown',
  });
}

/**
 * Track settings change
 */
export function trackSettingsChanged(setting?: string, value?: boolean): void {
  trackEvent('settings_changed', {
    setting: setting || 'unknown',
    enabled: value !== undefined ? value : false,
  });
}

/**
 * Set analytics preference
 *
 * @param enabled - Whether to enable analytics (true) or disable (false)
 */
export function setAnalyticsPreference(enabled: boolean): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, enabled ? 'true' : 'false');
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get current analytics preference
 */
export function getAnalyticsPreference(): boolean {
  try {
    const stored = localStorage.getItem(ANALYTICS_KEY);
    if (stored === 'false') {
      return false;
    }
    if (stored === 'true') {
      return true;
    }
  } catch {
    // localStorage may not be available
  }

  // Default to enabled if not explicitly disabled and doNotTrack is not set
  return isAnalyticsEnabled();
}

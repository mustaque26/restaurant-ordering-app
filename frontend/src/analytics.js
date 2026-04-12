// Simple analytics helper
// Usage: import { trackEvent } from './analytics'
// This will push events to window.dataLayer if available (Google Tag Manager),
// otherwise it will log to console for local development.
export function trackEvent(eventName, payload = {}) {
  try {
    if (typeof window !== 'undefined' && window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({ event: eventName, ...payload })
    } else if (typeof window !== 'undefined' && window._paq && typeof window._paq.push === 'function') {
      // Matomo style if present
      window._paq.push(['trackEvent', eventName, JSON.stringify(payload)])
    } else {
      // Fallback for dev: console log
      // Keep logs consistent and searchable
      // eslint-disable-next-line no-console
      console.info('[analytics]', eventName, payload)
    }
  } catch (err) {
    // swallow analytics errors to avoid breaking the app
    // eslint-disable-next-line no-console
    console.debug('Analytics track failed', err)
  }
}


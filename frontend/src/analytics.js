/**
 * Lightweight analytics helper.
 * Pushes events to window.dataLayer (GTM/GA4) when available,
 * otherwise logs to console for local development.
 */
export function trackEvent(name, data = {}) {
  if (window.dataLayer && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, ...data })
  } else {
    console.log('[analytics]', name, data)
  }
}

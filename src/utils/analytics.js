let initialized = false
let currentMeasurementId = ''

function hasWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function initAnalytics(measurementId) {
  const id = String(measurementId || '').trim()
  if (!id || initialized || !hasWindow()) return false

  currentMeasurementId = id
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }

  const existingScript = document.querySelector(`script[data-ga-id="${id}"]`)
  if (!existingScript) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    script.setAttribute('data-ga-id', id)
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  window.gtag('config', id, {
    anonymize_ip: true,
  })

  initialized = true
  return true
}

export function trackEvent(eventName, params = {}) {
  if (!hasWindow() || !window.gtag) return
  const name = String(eventName || '').trim()
  if (!name) return
  window.gtag('event', name, params)
}

export function getAnalyticsMeasurementId() {
  return currentMeasurementId
}

export async function checkServerHealth(url) {
  if (!url) return true

  const target = `${url.replace(/\/$/, '')}/games`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(target, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    clearTimeout(timeoutId)
    console.warn('Server wake-up check failed:', error)
    return false
  }
}

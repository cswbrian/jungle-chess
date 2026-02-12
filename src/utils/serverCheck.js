export async function checkServerHealth(url) {
  if (!url) return true; // No custom server, assume public cloud is up
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    // PeerJS server usually responds to / with a welcome message or JSON
    // We just need ANY response to wake it up
    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Server wake-up check failed:', error);
    return false;
  }
}

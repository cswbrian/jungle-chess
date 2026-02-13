# PWA Setup Instructions

Your jungle chess game is now configured as a Progressive Web App! 🎉

## What's Been Added

1. **Web App Manifest** (`public/manifest.json`) - Defines app metadata, icons, and display settings
2. **Service Worker** (`public/sw.js`) - Enables offline functionality and caching
3. **Updated HTML** - Added manifest link and iOS-specific meta tags
4. **Service Worker Registration** - Added to `src/main.jsx`

## Generating Icons

### Option 1: Use the HTML Generator (Easiest)
1. Open `generate-icons.html` in your browser
2. Click the download buttons to get both icons
3. Place `icon-192.png` and `icon-512.png` in the `public/` folder

### Option 2: Create Your Own Icons
Create two PNG images:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

Place them in the `public/` folder.

### Option 3: Use Online Tools
Use services like:
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/

## Testing Your PWA

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Testing Installation

1. **Desktop (Chrome/Edge)**
   - Visit your deployed site
   - Look for the install icon in the address bar
   - Click to install

2. **Mobile (iOS)**
   - Open in Safari
   - Tap the Share button
   - Select "Add to Home Screen"

3. **Mobile (Android)**
   - Open in Chrome
   - Tap the three-dot menu
   - Select "Add to Home Screen"

## Deployment

For the PWA to work properly, you need to:

1. Deploy to a server with HTTPS (required for service workers)
2. Make sure the `base` path in `vite.config.js` matches your deployment URL
3. Update paths in `manifest.json` and `sw.js` if your base path changes

### GitHub Pages
The current configuration (`base: '/jungle-chess/'`) is set up for GitHub Pages deployment.

### Other Hosting
If deploying elsewhere (Vercel, Netlify, etc.), update:
- `vite.config.js`: Change `base` to `'/'`
- `public/manifest.json`: Update `start_url` and icon paths
- `public/sw.js`: Update `BASE_PATH` constant
- `.env`: Set `VITE_BGIO_SERVER_URL` to your deployed boardgame.io server URL

## Online Multiplayer Server (Render)

The online mode depends on a boardgame.io backend server.

1. Deploy `server/index.js` as a Render Web Service.
2. Build command: `npm install`
3. Start command: `npm run server`
4. Set `CORS_ORIGINS` to include your frontend origin(s).

Note: Render free tier may sleep. First reconnect after idle can take around 20-90 seconds; the app shows a wake-up waiting message.

## Features

✅ **Installable** - Users can install the app to their home screen
✅ **Offline Support** - Service worker caches assets for offline play
✅ **App-like Experience** - Full-screen display without browser UI
✅ **Fast Loading** - Cached resources load instantly
✅ **Mobile Optimized** - Works great on iOS and Android

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure you're serving over HTTPS (or localhost)
- Clear cache and hard reload

### Icons Not Showing
- Verify icons are in the `public/` folder
- Check that paths in manifest.json match your deployment
- Clear browser cache

### Install Prompt Not Appearing
- PWAs require HTTPS (except localhost)
- Make sure manifest.json is accessible
- Some browsers have specific criteria (e.g., user engagement)

## Next Steps

1. Generate and add the app icons
2. Build and deploy your app
3. Test installation on different devices
4. Consider adding an install prompt in your UI
5. Add a screenshot for better app store presentation

Enjoy your installable jungle chess PWA! 🎮✨

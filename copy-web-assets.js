const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'assets', 'icon.png');

// 1. Copy to assets folder
const assetTargets = [
  path.join(__dirname, 'assets', 'favicon.png'),
  path.join(__dirname, 'assets', 'apple-touch-icon.png'),
  path.join(__dirname, 'assets', 'apple-touch-icon-precomposed.png'),
  path.join(__dirname, 'assets', 'icon-192.png'),
  path.join(__dirname, 'assets', 'icon-512.png')
];

assetTargets.forEach(target => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, target);
    console.log(`Created asset: ${path.basename(target)}`);
  }
});

// 2. Copy directly to dist folder root for Vercel & iOS Safari PWA
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const distTargets = [
  path.join(distDir, 'apple-touch-icon.png'),
  path.join(distDir, 'apple-touch-icon-precomposed.png'),
  path.join(distDir, 'apple-touch-icon-180x180.png'),
  path.join(distDir, 'favicon.png'),
  path.join(distDir, 'favicon.ico'),
  path.join(distDir, 'icon-192.png'),
  path.join(distDir, 'icon-512.png'),
  path.join(distDir, 'icon.png')
];

distTargets.forEach(target => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, target);
    console.log(`Copied to dist root: ${path.basename(target)}`);
  }
});

// 3. Generate Web App Manifest for Standalone Fullscreen Mode
const manifestContent = JSON.stringify({
  name: "Hidaya - Islamic App",
  short_name: "Hidaya",
  description: "Your Comprehensive Islamic Companion App",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0d2b1a",
  theme_color: "#0d2b1a",
  icons: [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png"
    }
  ]
}, null, 2);

fs.writeFileSync(path.join(distDir, 'manifest.json'), manifestContent);
console.log('Generated manifest.json in dist root');

// 4. Generate Service Worker for PWA Standalone registration on iOS Safari
const swContent = `// Service Worker for Hidaya Standalone PWA
const CACHE_NAME = 'hidaya-cache-v1';
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  // Let network handle requests dynamically
});
`;

fs.writeFileSync(path.join(distDir, 'sw.js'), swContent);
console.log('Generated sw.js in dist root');

// 5. Ensure dist/index.html contains iOS PWA Meta Tags & Manifest
const distHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(distHtmlPath)) {
  let html = fs.readFileSync(distHtmlPath, 'utf8');

  const pwaTags = `
    <!-- iOS PWA Fullscreen Standalone Meta Tags & Native App Styling -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Hidaya" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#0d2b1a" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
    <style>
      html, body, #root {
        width: 100%;
        height: 100%;
        height: 100dvh;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background-color: #061a10;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      @font-face {
        font-family: 'Ionicons';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
      }
      @font-face {
        font-family: 'MaterialCommunityIcons';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
      }
      @font-face {
        font-family: 'FontAwesome5_Solid';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype');
      }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); }
      ::-webkit-scrollbar-thumb { background: #1F5C3D; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
      body { overscroll-behavior-y: none; }
      @media (max-width: 500px) {
        html, body, #root {
          width: 100% !important;
          height: 100% !important;
          height: 100dvh !important;
        }
      }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').catch(function() {});
        });
      }
      (function(a,b,c){if(c in b&&b[c]){var d,e=a.location,f=/^(a|html)$/i;a.addEventListener("click",function(a){d=a.target;while(!f.test(d.nodeName))d=d.parentNode;"href"in d&&(d.href.indexOf("http")||~d.href.indexOf(e.host))&&(a.preventDefault(),e.href=d.href)},!1)}})(document,window.navigator,"standalone");
    </script>
  `;

  if (!html.includes('apple-mobile-web-app-capable')) {
    html = html.replace('</head>', `${pwaTags}\n</head>`);
    fs.writeFileSync(distHtmlPath, html);
    console.log('Injected PWA tags and CSS into dist/index.html');
  }
}

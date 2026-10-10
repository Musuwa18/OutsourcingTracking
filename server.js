/**
 * Express Production Static Server for OutsourceTrack & KPI Pro
 * Digunakan jika deployment ke VPS menggunakan Node.js / PM2 secara langsung tanpa Docker.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3010;
const DIST_DIR = path.join(__dirname, 'dist');

// Security & Caching Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Sajikan berkas statis dari direktori dist/
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    // index.html jangan di-cache lama agar update kode langsung terlihat
    if (path.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Health Check Endpoint untuk Uptime Monitor & Cloudflare Tunnel
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    app: 'OutsourceTrack & KPI Pro',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Fallback semua rute client-side (SPA) ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 OutsourceTrack & KPI Pro Production Server Aktif`);
  console.log(`📍 Port Internal: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Public URL   : ${process.env.VITE_APP_URL || 'https://outsourcing.renlapdisdikhst.pro'}`);
  console.log(`====================================================`);
});

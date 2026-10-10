#!/bin/bash
# ==============================================================================
# Script Otomatis Deployment VPS - OutsourceTrack & KPI Pro
# Domain: https://outsourcing.renlapdisdikhst.pro (Cloudflare Tunnel)
# ==============================================================================

set -e

PORT=3005
APP_NAME="outsource-track-kpi"

echo "========================================================"
echo "  🚀 OutsourceTrack & KPI Pro - VPS Deployment Tool"
echo "  🌐 Domain : https://outsourcing.renlapdisdikhst.pro"
echo "  📍 Port   : 127.0.0.1:${PORT}"
echo "========================================================"

# 1. Update kode terbaru dari Git
echo "[1/4] Mengambil pembaruan kode terbaru dari Git..."
git pull origin main

# 2. Pemilihan Metode Deployment
echo ""
echo "Pilih metode deployment di VPS Anda:"
echo "  [1] Docker Compose (Rekomendasi - Otomatis & Terisolasi)"
echo "  [2] Node.js + PM2 (Manual Express Server)"
echo "  [3] Hanya Build Asset (npm run build)"
read -p "Masukkan pilihan [1/2/3] (Default: 1): " DEPLOY_METHOD
DEPLOY_METHOD=${DEPLOY_METHOD:-1}

if [ "$DEPLOY_METHOD" = "1" ]; then
    echo ""
    echo "[2/4] Membangun dan menjalankan kontainer Docker..."
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose down || true
        docker compose up -d --build
        echo "✅ Kontainer Docker berhasil dijalankan!"
    else
        echo "❌ Docker atau Docker Compose belum terpasang di VPS!"
        echo "Silakan gunakan metode [2] PM2 atau pasang Docker terlebih dahulu."
        exit 1
    fi

elif [ "$DEPLOY_METHOD" = "2" ]; then
    echo ""
    echo "[2/4] Memasang dependensi & mengompilasi bundel statis..."
    npm install
    npm run build

    echo "[3/4] Menjalankan server produksi dengan PM2 di port ${PORT}..."
    if command -v pm2 &> /dev/null; then
        pm2 restart outsource-track 2>/dev/null || pm2 start server.js --name outsource-track --env PORT=${PORT}
        pm2 save
        echo "✅ Server Node.js berhasil dijalankan dengan PM2!"
    else
        echo "⚠️ PM2 belum terpasang. Menjalankan di background dengan nohup..."
        nohup node server.js > server.log 2>&1 &
        echo "✅ Server Node.js berjalan di background (PID: $!)."
    fi

elif [ "$DEPLOY_METHOD" = "3" ]; then
    echo ""
    echo "[2/4] Memasang dependensi & mengompilasi bundel statis..."
    npm install
    npm run build
    echo "✅ Kompilasi bundel dist/ selesai!"
    exit 0
fi

# 3. Pengujian Health Check
echo ""
echo "[4/4] Memverifikasi status server lokal..."
sleep 3
if curl -s http://127.0.0.1:${PORT}/health | grep -q "healthy\|OK"; then
    echo "========================================================"
    echo "🎉 DEPLOYMENT BERHASIL & STATUS SERVER SEHAT (PORT ${PORT})"
    echo "========================================================"
    echo "Langkah selanjutnya:"
    echo "1. Pastikan Cloudflare Tunnel Anda mengarahkan:"
    echo "   Subdomain: outsourcing.renlapdisdikhst.pro"
    echo "   Service  : http://localhost:${PORT}"
    echo "2. Buka https://outsourcing.renlapdisdikhst.pro di HP Anda"
    echo "   untuk menguji Kamera WebRTC dan Presensi GPS!"
    echo "========================================================"
else
    echo "⚠️ Peringatan: Server belum merespons di port ${PORT}. Periksa log docker atau server.js."
fi

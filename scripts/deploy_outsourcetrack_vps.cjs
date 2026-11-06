const { execSync } = require('child_process');

console.log('================================================================');
console.log('  🚀 DEPLOY PEMBARUAN OUTSOURCETRACK KE SERVER VPS');
console.log('================================================================');

const VPS_HOST = process.env.VPS_HOST || 'vps';
const VPS_PORT = process.env.VPS_PORT;
const VPS_USER = process.env.VPS_USER;

let sshTarget = VPS_HOST;
if (VPS_HOST !== 'vps' && VPS_USER) {
  sshTarget = `${VPS_USER}@${VPS_HOST}`;
}
const portFlag = VPS_PORT ? `-p ${VPS_PORT}` : '';

const remoteBashScript = `
set -e

echo ">> Mencari lokasi outsource-track di VPS..."
sudo pm2 show outsource-track | grep "exec mode\\|script path\\|exec cwd" || true

OUTSOURCE_DIR=$(sudo pm2 show outsource-track | grep "exec cwd" | awk '{print $4}' | tr -d ' ')
if [ -z "$OUTSOURCE_DIR" ]; then
  OUTSOURCE_DIR="/var/www/outsourcing-tracking"
fi
echo ">> Direktori aplikasi: $OUTSOURCE_DIR"

cd "$OUTSOURCE_DIR"

# Proteksi backup SQLite otomatis di VPS sebelum operasi git berjalan
if [ -f "$OUTSOURCE_DIR/data/outsource_track.db" ]; then
  echo ">> Membuat backup database lokal VPS sebelum update git..."
  cp "$OUTSOURCE_DIR/data/outsource_track.db" "$OUTSOURCE_DIR/data/outsource_track.db.bak_$(date +%Y%m%d_%H%M%S)"
fi

git fetch origin main
git reset --hard origin/main

# Jika git reset menghapus database karena transisi untracking, pulihkan dari backup
if [ ! -f "$OUTSOURCE_DIR/data/outsource_track.db" ]; then
  LATEST_BAK=$(ls -t "$OUTSOURCE_DIR/data/outsource_track.db.bak_"* 2>/dev/null | head -n 1)
  if [ -n "$LATEST_BAK" ]; then
    echo ">> Memulihkan database SQLite dari backup ($LATEST_BAK)..."
    cp "$LATEST_BAK" "$OUTSOURCE_DIR/data/outsource_track.db"
  fi
fi

npm run build
sudo pm2 restart outsource-track

echo ">> Status PM2 terkini:"
sudo pm2 list
`;

const b64 = Buffer.from(remoteBashScript).toString('base64');
const cmd = `ssh ${portFlag} -o StrictHostKeyChecking=no ${sshTarget} "echo '${b64}' | base64 -d | bash"`.replace(/\s+/g, ' ').trim();

try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('\n================================================================');
  console.log('  🎉 DEPLOYMENT OUTSOURCETRACK BERHASIL!');
  console.log('  🌐 Domain : https://outsourcing.renlapdisdikhst.pro');
  console.log('================================================================');
} catch (err) {
  console.error('\n❌ Gagal saat deployment:', err.message);
  process.exit(1);
}

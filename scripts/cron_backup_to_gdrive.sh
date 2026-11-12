#!/usr/bin/env bash
# ==============================================================================
# OUTSOURCETRACK & KPI PRO - Pencadangan Otomatis Harian ke Google Drive via Rclone
# Dinas Pendidikan Kabupaten Hulu Sungai Tengah
# ==============================================================================
set -euo pipefail

APP_DIR="/var/www/outsourcing-tracking"
DATA_DIR="${APP_DIR}/data"
UPLOADS_DIR="${APP_DIR}/uploads"
BACKUP_DIR="/var/backups/outsourcing-tracking"
STAGE_DIR="${BACKUP_DIR}/staging"
LOG_FILE="/var/log/outsourcetrack_backup.log"
GDRIVE_REMOTE="gdrive:Backup_OutsourceTrack"
RETENTION_LOCAL_DAYS=3
RETENTION_GDRIVE_DAYS="30d"

TIMESTAMP=$(TZ="Asia/Makassar" date +'%Y%m%d_%H%M%S')
DATE_DISPLAY=$(TZ="Asia/Makassar" date +'%d-%m-%Y %H:%M:%S WITA')
ARCHIVE_NAME="outsourcetrack_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

mkdir -p "$BACKUP_DIR" "$STAGE_DIR" "$(dirname "$LOG_FILE")"

log() {
  local msg="[$DATE_DISPLAY] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

log "=================================================================="
log "🚀 MEMULAI PROSES PENCADANGAN HARIAN OUTSOURCETRACK & KPI PRO"
log "=================================================================="

# 1. Snapshot konsisten SQLite via Python backup API
log ">> [1/6] Snapshot konsisten SQLite database (outsource_track.db)..."
/usr/bin/python3 - "$DATA_DIR" "$STAGE_DIR" << 'PYEOF' >> "$LOG_FILE" 2>&1
import sqlite3, sys, os
data_dir, stage_dir = sys.argv[1], sys.argv[2]
src_file = os.path.join(data_dir, "outsource_track.db")
dst_file = os.path.join(stage_dir, "outsource_track_snapshot.db")

if not os.path.exists(src_file):
    print(f"   [WARN] {src_file} tidak ditemukan, membuat berkas kosong.")
    open(dst_file, 'a').close()
else:
    con = sqlite3.connect(f"file:{src_file}?mode=ro", uri=True)
    if os.path.exists(dst_file):
        os.remove(dst_file)
    bak = sqlite3.connect(dst_file)
    with bak:
        con.backup(bak)
    chk = bak.execute("PRAGMA integrity_check").fetchone()[0]
    bak.close()
    con.close()
    size_mb = os.path.getsize(dst_file) / (1024 * 1024)
    print(f"   [OK] Snapshot SQLite selesai: {size_mb:.2f} MB, integritas: {chk}")
PYEOF

# 2. Dump SQL dan Ekspor JSON Cadangan
log ">> [2/6] Memperbarui dump cadangan SQL & JSON..."
/usr/bin/python3 - "$STAGE_DIR" << 'PYEOF' >> "$LOG_FILE" 2>&1
import sqlite3, json, sys, os, datetime
stage_dir = sys.argv[1]
db_path = os.path.join(stage_dir, "outsource_track_snapshot.db")
if os.path.exists(db_path) and os.path.getsize(db_path) > 0:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    dump_path = os.path.join(stage_dir, "outsource_track_dump.sql")
    with open(dump_path, "w", encoding="utf-8") as f:
        for line in con.iterdump():
            f.write(f"{line}\n")
    con.close()
    print("   [OK] Dump SQL berhasil dibuat.")
PYEOF

# 3. Kompresi Arsip Lengkap (Aplikasi + Database Snapshot + Uploads + Env)
log ">> [3/6] Mengompresi berkas cadangan aplikasi dan data lengkap..."
tar --warning=no-file-changed -czf "$ARCHIVE_PATH" \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude=".git" \
  --exclude="data" \
  --exclude="*.tar.gz" \
  -C "$STAGE_DIR" outsource_track_snapshot.db $(ls "$STAGE_DIR" | grep -E '\.sql$' || true) \
  -C "$APP_DIR" . 2>> "$LOG_FILE" || \
tar --warning=no-file-changed -czf "$ARCHIVE_PATH" -C "$STAGE_DIR" outsource_track_snapshot.db -C "$APP_DIR" --ignore-failed-read uploads .env server.js package.json
ARCHIVE_BYTES=$(stat -c%s "$ARCHIVE_PATH" 2>/dev/null || stat -f%z "$ARCHIVE_PATH")
ARCHIVE_MB=$(awk "BEGIN {printf \"%.2f\", $ARCHIVE_BYTES / (1024 * 1024)}")
log "   [OK] Arsip terbuat: ${ARCHIVE_NAME} (${ARCHIVE_MB} MB)"

tar -tzf "$ARCHIVE_PATH" >/dev/null 2>&1 || { log "❌ [ERROR] Verifikasi integritas arsip tar gagal!"; exit 1; }

# 4. Unggah ke Google Drive via Rclone
log ">> [4/6] Mengunggah arsip ke Google Drive (${GDRIVE_REMOTE})..."
GDRIVE_SUCCESS=false
if command -v rclone &>/dev/null && rclone listremotes 2>/dev/null | grep -q '^gdrive:'; then
  if rclone copy "$ARCHIVE_PATH" "${GDRIVE_REMOTE}/" --log-file="$LOG_FILE" --log-level=NOTICE; then
    log "   [OK] Berhasil diunggah ke Google Drive: ${GDRIVE_REMOTE}/${ARCHIVE_NAME}"
    GDRIVE_SUCCESS=true
    log ">> [5/6] Retensi Google Drive (menghapus arsip > ${RETENTION_GDRIVE_DAYS})..."
    rclone delete --min-age "$RETENTION_GDRIVE_DAYS" "${GDRIVE_REMOTE}/" --log-file="$LOG_FILE" --log-level=NOTICE || true
  else
    log "⚠️ [WARNING] Gagal mengunggah ke Google Drive via rclone!"
  fi
else
  log "ℹ️ [INFO] Remote 'gdrive:' belum tersedia; arsip disimpan di server lokal."
fi

# 5. Retensi Lokal
log ">> [6/6] Retensi lokal (menghapus arsip lokal > ${RETENTION_LOCAL_DAYS} hari)..."
find "$BACKUP_DIR" -maxdepth 1 -name "outsourcetrack_backup_*.tar.gz" -mtime +"$RETENTION_LOCAL_DAYS" -exec rm -f {} + 2>/dev/null || true
rm -rf "$STAGE_DIR"/*
log "   [OK] Direktori lokal dibersihkan."

log "🎉 PENCADANGAN OUTSOURCETRACK & KPI PRO SELESAI (Google Drive: ${GDRIVE_SUCCESS})!"
log "=================================================================="

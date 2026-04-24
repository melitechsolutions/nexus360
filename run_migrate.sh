#!/bin/bash
cd /home/melitec1/Nexus360

DB_USER="melitec1_nexus360"
DB_PASS="Nx360_Pr0d_2026!Secure"
DB_NAME="melitec1_nexus360"
MIG_DIR="drizzle/migrations"

MYSQL="mysql -u $DB_USER -p$DB_PASS $DB_NAME"

# Ensure migrations table exists
$MYSQL <<'ENDSQL'
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(256) NOT NULL UNIQUE,
  created_at BIGINT
) CHARACTER SET utf8mb4;
ENDSQL

echo "[Migrate] Table ready"

# Get applied migration hashes
APPLIED=$($MYSQL -sN -e "SELECT hash FROM __drizzle_migrations;")

echo "[Migrate] Applied: $(echo "$APPLIED" | wc -l)"

for sql_file in $MIG_DIR/*.sql; do
  filename=$(basename "$sql_file" .sql)
  if echo "$APPLIED" | grep -qxF "$filename"; then
    echo "[Migrate] Skip: $filename"
    continue
  fi
  echo "[Migrate] Applying: $filename"
  if $MYSQL < "$sql_file" 2>&1; then
    $MYSQL -e "INSERT IGNORE INTO __drizzle_migrations (hash, created_at) VALUES ('$filename', UNIX_TIMESTAMP()*1000);"
    echo "[Migrate] Done: $filename"
  else
    echo "[Migrate] Error on: $filename (continuing)"
  fi
done

echo "[Migrate] All done!"

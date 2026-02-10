#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema..."
  npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true
  echo "Running seed..."
  npx prisma db seed 2>/dev/null || true
fi
exec "$@"

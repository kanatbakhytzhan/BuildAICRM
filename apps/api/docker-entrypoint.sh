#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema..."
  npx prisma db push --skip-generate || true
  echo "Running seed..."
  npx prisma db seed || true
fi
exec "$@"

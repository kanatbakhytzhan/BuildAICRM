#!/bin/sh
set -e
# Skip db push if already done (flag in persistent volume = fast restarts)
if [ -f /app/uploads/.schema-done ]; then
  echo "Schema already applied, starting app."
  exec node dist/main.js
fi
echo "Waiting for network..."
sleep 3
for i in 1 2 3 4 5; do
  if npx prisma db push; then
    touch /app/uploads/.schema-done
    echo "Database schema ready."
    exec node dist/main.js
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done
echo "Database push failed after 5 attempts."
exit 1

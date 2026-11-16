#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/root/library-umc"
cd "$REPO_DIR"

# 1. Fetch upstream dan origin terbaru
git fetch upstream main
git fetch origin main

# Pastikan branch main lokal sinkron dengan origin/main
git checkout -q main
git reset --hard origin/main

# 2. Cek apakah upstream/main sudah ada di origin/main
LOCAL_MAIN=$(git rev-parse origin/main)
UPSTREAM_MAIN=$(git rev-parse upstream/main)

if git merge-base --is-ancestor "$UPSTREAM_MAIN" "$LOCAL_MAIN"; then
    echo "STATUS: UP_TO_DATE (upstream commit $UPSTREAM_MAIN is already in origin/main)"
    exit 0
fi

echo "STATUS: OUTDATED. Upstream: $UPSTREAM_MAIN, Local/Origin: $LOCAL_MAIN"

# 3. Buat staging branch untuk validasi build
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
STAGING_BRANCH="sync/upstream-validation-$TIMESTAMP"

git checkout -B "$STAGING_BRANCH" upstream/main

# 4. Validasi Build Backend
echo "VALIDATING: library-be build..."
cd "$REPO_DIR/library-be"
npm install --no-audit --no-fund --prefer-offline
if ! npm run build; then
    echo "ERROR: Backend build failed on upstream commit $UPSTREAM_MAIN!"
    git checkout main
    exit 1
fi

# 5. Validasi Build Frontend
echo "VALIDATING: library-fe build..."
cd "$REPO_DIR/library-fe"
npm install --no-audit --no-fund --prefer-offline
if ! npm run build; then
    echo "ERROR: Frontend build failed on upstream commit $UPSTREAM_MAIN!"
    cd "$REPO_DIR"
    git checkout main
    exit 1
fi

# 6. Jika semua lolos build, merge ke main & push ke fork janfdev
cd "$REPO_DIR"
git checkout main
git merge --ff-only upstream/main || git merge upstream/main -m "chore(sync): fast-forward sync from upstream/main ($UPSTREAM_MAIN)"
git push origin main

# Bersihkan branch validasi
git branch -D "$STAGING_BRANCH"

echo "SUCCESS: Successfully synced upstream/main ($UPSTREAM_MAIN) to janfdev/library-umc main"

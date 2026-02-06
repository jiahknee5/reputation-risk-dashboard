#!/bin/bash
# RepRisk v2 LOCKED Build Script
# This script builds v2 exactly as deployed in production
# DO NOT MODIFY - v2 is locked and stable

set -e  # Exit on any error

echo "Building RepRisk v2 (LOCKED)..."
echo "================================"

# Ensure we're on main branch at v2.0.0 tag
cd "$(dirname "$0")"
git fetch --tags
git checkout v2.0.0

# Verify we have the .env file with API key
if [ ! -f "frontend/.env" ]; then
    echo "ERROR: frontend/.env file not found!"
    echo "v2 requires .env file with VITE_ANTHROPIC_KEY"
    exit 1
fi

# Build with correct base path
cd frontend
echo "Building with base path /repriskdev/..."
VITE_BASE_PATH=/repriskdev/ npm run build

echo ""
echo "✅ Build complete!"
echo "Output: frontend/dist/"
echo ""
echo "To deploy:"
echo "  cp -r frontend/dist/* ~/johnnycchung-portal/public/repriskdev/"
echo "  cd ~/johnnycchung-portal"
echo "  git add public/repriskdev/"
echo "  git commit -m 'Rebuild v2 from locked script'"
echo "  git push && npx vercel --prod"

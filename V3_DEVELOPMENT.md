# v3 Development Guide

**Current Branch:** `v3`
**Status:** Active Development
**Base:** v2.0.0 (stable)

---

## Quick Start

```bash
cd frontend
npm run dev
```

Dev server runs at: http://localhost:5173

---

## v3 Roadmap

### Phase 1: Backend API Proxy (Priority)
**Goal:** Enable real CFPB and GDELT data without CORS issues

**Tasks:**
- [ ] Create Next.js API routes in portal:
  - `/api/reprisk/cfpb` - Proxy for CFPB Consumer Complaint API
  - `/api/reprisk/gdelt` - Proxy for GDELT News API
  - `/api/reprisk/news` - Proxy for NewsAPI (optional)
- [ ] Update frontend `api.ts` to call proxy endpoints instead of direct APIs
- [ ] Add API response caching (5 min TTL)
- [ ] Add rate limiting to prevent abuse
- [ ] Set `VITE_USE_REAL_DATA=true` environment variable
- [ ] Test with real data
- [ ] Deploy and verify

### Phase 2: TBD
(Add features here as needed)

---

## Development Workflow

1. **Make changes on v3 branch**
   ```bash
   git checkout v3
   # Make your changes
   git add -A
   git commit -m "v3: Description of changes"
   git push
   ```

2. **Test locally**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Build and test production build**
   ```bash
   VITE_BASE_PATH=/repriskdev/ npm run build
   # Serve dist folder to test
   ```

4. **When ready to deploy v3 to production**
   ```bash
   # Build v3
   cd frontend
   VITE_BASE_PATH=/repriskdev/ npm run build

   # Copy to portal
   cp -r dist/* ~/johnnycchung-portal/public/repriskdev/

   # Deploy portal
   cd ~/johnnycchung-portal
   git add public/repriskdev/
   git commit -m "Deploy RepRisk v3"
   git push
   npx vercel --prod
   ```

---

## Important Notes

- **v2 is LOCKED** - Do not modify the `main` branch or `v2.0.0` tag
- **All development happens on `v3` branch**
- **Breaking changes are OK on v3** - It's a new major version
- **Test thoroughly before deploying to production**

---

## Environment Variables

### Development (.env.local)
```bash
VITE_BASE_PATH=/
VITE_USE_REAL_DATA=true  # When backend proxy is ready
VITE_ANTHROPIC_KEY=sk-ant-...
VITE_NEWSAPI_KEY=...  # Optional
```

### Production (Vercel Build)
```bash
VITE_BASE_PATH=/repriskdev/
VITE_USE_REAL_DATA=true  # After proxy is implemented
```

---

## Rollback to v2

If v3 has issues and you need to rollback:

```bash
git checkout v2.0.0
cd frontend
VITE_BASE_PATH=/repriskdev/ npm run build
cp -r dist/* ~/johnnycchung-portal/public/repriskdev/
# Deploy portal
```

This restores the stable v2 version.

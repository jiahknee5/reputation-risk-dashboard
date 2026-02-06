# RepRisk v2 - LOCKED & STABLE

**Status:** ✅ Production Stable
**Deployed:** johnnycchung.com/repriskdev/
**Git Tag:** v2.0.0
**Last Updated:** 2026-02-06

---

## ⚠️ CRITICAL: v2 is LOCKED

- **DO NOT modify files on main branch** - All development happens on v3
- **DO NOT manually edit v2 build** - Use `build-v2-locked.sh` to rebuild
- **DO NOT change v2.0.0 tag** - This tag is immutable
- **DO NOT deploy v3 to /repriskdev/** - v3 goes to /repriskv3/

---

## Features (v2.0.0)

- ✅ 23 US banks (all Fed Category I/II/III)
- ✅ 3 default peer categories
- ✅ Light/Dark mode toggle with localStorage persistence
- ✅ Real CFPB data via backend proxy (90-day lookback)
- ✅ Real GDELT news via backend proxy
- ✅ AI chat via backend proxy (no browser API key exposure)
- ✅ Demo data fallback for stable operation
- ✅ 10 pages: Dashboard, Monitoring, Risk Detail, Peers, Regulatory, Crisis, Stakeholders, Reports, Feedback, Chat

---

## Architecture

### Frontend
- **Framework:** Vite + React + TypeScript
- **Base Path:** `/repriskdev/`
- **Build Output:** `frontend/dist/`
- **Environment Variables:**
  - `VITE_BASE_PATH=/repriskdev/` (set at build time)
  - `VITE_USE_REAL_DATA=true` (enables real data APIs)

### Backend
- **Proxy Endpoints:**
  - `/api/reprisk/cfpb` - CFPB Consumer Complaint Database
  - `/api/reprisk/gdelt` - GDELT News API
  - `/api/reprisk/chat` - Claude Sonnet AI chat
- **API Key:** `ANTHROPIC_API_KEY` (Vercel environment variable)
- **Caching:** 5-minute TTL for CFPB/GDELT

---

## Rebuild Process

### Quick Rebuild (Recommended)
```bash
cd /Users/johnnychung/reputation-risk-dashboard
./build-v2-locked.sh
```

### Manual Rebuild (If Script Fails)
```bash
cd /Users/johnnychung/reputation-risk-dashboard
git fetch --tags
git checkout v2.0.0
cd frontend
VITE_BASE_PATH=/repriskdev/ npm run build
cp -r dist/* ~/johnnycchung-portal/public/repriskdev/
cd ~/johnnycchung-portal
git add public/repriskdev/
git commit -m "Rebuild v2 from v2.0.0 tag"
git push && npx vercel --prod
```

---

## Rollback Instructions

If v2 breaks in production, rollback immediately:

```bash
# 1. Get last known good deployment ID from Vercel dashboard
#    https://vercel.com/johnnys-projects-0e834ac4/johnnycchung-portal/deployments

# 2. Rollback via CLI
cd ~/johnnycchung-portal
vercel rollback <deployment-url>

# OR rebuild from scratch
cd /Users/johnnychung/reputation-risk-dashboard
./build-v2-locked.sh
# Then follow deploy steps
```

---

## Deployment Checklist

Before deploying v2 changes:

- [ ] Verified build script runs without errors
- [ ] Checked `dist/index.html` has correct asset paths (`/repriskdev/assets/...`)
- [ ] Tested locally by serving `dist/` folder
- [ ] Verified bundle size is reasonable (~750KB JS)
- [ ] Confirmed no API keys in bundle
- [ ] Pushed to GitHub before deploying
- [ ] Used `npx vercel --prod` (NOT just `git push`)

---

## Known Issues & Gotchas

### Issue: Blank White Screen
**Cause:** Wrong base path in build
**Fix:** Always use `VITE_BASE_PATH=/repriskdev/` environment variable

### Issue: Chat "Failed to Fetch"
**Cause:** Invalid or missing `ANTHROPIC_API_KEY` on Vercel
**Fix:**
```bash
vercel env rm ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY production
# Enter the key from frontend/.env
vercel --prod  # Redeploy
```

### Issue: Assets Return 404
**Cause:** vercel.json missing `/repriskdev/(.*)` rewrite
**Fix:** Check `johnnycchung-portal/vercel.json` has:
```json
{ "source": "/repriskdev/(.*)", "destination": "/repriskdev/index.html" }
```

---

## File Locations

| Item | Location |
|------|----------|
| Source Code (v2) | `reputation-risk-dashboard` main branch, v2.0.0 tag |
| Build Script | `reputation-risk-dashboard/build-v2-locked.sh` |
| Deployed Files | `johnnycchung-portal/public/repriskdev/` |
| Backend Proxies | `johnnycchung-portal/src/app/api/reprisk/` |
| Environment Variables | Vercel dashboard → Settings → Environment Variables |

---

## Contact & Support

**Owner:** Johnny Chung
**Credentials:** `test_reprisk` / `Dp@6tNwK7sXqFh3Z`
**URL:** https://johnnycchung.com/repriskdev/

---

## Version History

### v2.0.0 (2026-02-06) - LOCKED
- Initial locked release
- Backend proxy for all APIs
- 23 banks, 3 peer categories
- Light/dark mode

### Future
- All new features go to v3 branch → /repriskv3/

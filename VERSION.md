# RepRisk Intel - Version History

## ⚠️ CRITICAL: v2 is LOCKED - DO NOT MODIFY

**See `V2_LOCKED.md` for complete documentation.**
- Use `./build-v2-locked.sh` to rebuild v2
- All development happens on v3 branch
- v2.0.0 tag is immutable

---

## v2.0.0 (STABLE - LOCKED) - 2026-02-06

**Tag:** `v2.0.0`
**Branch:** `main`
**Deployed:** https://johnnycchung.com/repriskdev/

### Features
- ✅ Light/Dark mode toggle with localStorage persistence
- ✅ 3 Federal Reserve peer categories (Category I/II/III)
- ✅ 23 US banks (all Fed Category I/II/III institutions)
- ✅ Demo data (stable, no CORS issues)
- ✅ 12 pages: Dashboard, Monitoring, Risk Detail, Peers, Peer Groups, Regulatory, Crisis, Stakeholders, Reports, Data Sources, Chat, Feedback
- ✅ Real-time signal feed (CFPB complaints + news)
- ✅ McKinsey-style framing (objectives, insights, recommendations)
- ✅ Auth-protected (requires login)

### Tech Stack
- React 18 + TypeScript
- Vite build system
- Tailwind CSS with dark mode
- Recharts for visualization
- React Router for navigation
- Lucide icons

### Credentials
- Username: `test_reprisk`
- Password: `Dp@6tNwK7sXqFh3Z`

---

## v3.0.0 (IN DEVELOPMENT) - 2026-02-06+

**Branch:** `v3`
**Status:** Active development

### Planned Features
- [ ] Backend API proxy for real CFPB/GDELT data (no CORS)
- [ ] Additional features TBD

### Breaking Changes from v2
- TBD

---

## Rollback Instructions

To deploy v2 stable version:
```bash
git checkout v2.0.0
cd frontend
VITE_BASE_PATH=/repriskdev/ npm run build
cp -r dist/* ~/johnnycchung-portal/public/repriskdev/
# Then deploy portal to Vercel
```

To continue v3 development:
```bash
git checkout v3
cd frontend
npm run dev
```

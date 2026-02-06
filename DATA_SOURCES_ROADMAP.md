# RepRisk Data Sources Roadmap

## Current Integrations (✅ Live)

| Source | Type | Update Frequency | Cost | Status |
|--------|------|------------------|------|--------|
| **CFPB Consumer Complaints** | Consumer Protection | Real-time | Free | ✅ Integrated |
| **NewsAPI** | Media Sentiment | Real-time | Free (localhost) / Paid (prod) | ✅ Integrated |
| **GDELT Project** | Global News | Real-time | Free | ✅ Integrated |
| **SEC EDGAR** | Regulatory Filings | Daily | Free | ✅ Infrastructure (CORS blocked) |
| **OCC Enforcement** | Regulatory | Monthly | Free | ✅ Infrastructure (CORS blocked) |
| **FDIC Enforcement** | Regulatory | Monthly | Free | ✅ Infrastructure (CORS blocked) |
| **Federal Reserve Enforcement** | Regulatory | Monthly | Free | ✅ Infrastructure (CORS blocked) |

---

## Phase 2: High-Priority Free Sources (📋 Planned)

### FinCEN Enforcement Actions
**URL:** https://www.fincen.gov/news-room/enforcement-actions
**Type:** BSA/AML Enforcement
**Update Frequency:** Monthly
**Cost:** Free
**Integration Priority:** HIGH

**What It Provides:**
- Bank Secrecy Act (BSA) violations
- Anti-Money Laundering (AML) enforcement
- Civil money penalties for BSA/AML failures
- SAR (Suspicious Activity Report) filing violations

**Use Case:**
- Early warning for BSA/AML program deficiencies
- Tracks institutions with pattern of AML failures
- Complements OCC/FDIC enforcement data with AML-specific lens

**API Access:** No public API — web scraping or RSS feed parsing required

**Data Fields:**
- Institution name
- Enforcement action type (Civil Money Penalty, Consent Order)
- Violation description (SAR filing, CDD, CTR)
- Penalty amount
- Action date

---

### OFAC Sanctions List (SDN)
**URL:** https://sanctionssearch.ofac.treas.gov/
**Type:** Sanctions Compliance
**Update Frequency:** Daily
**Cost:** Free
**Integration Priority:** MEDIUM

**What It Provides:**
- Specially Designated Nationals (SDN) list
- Sanctions violations by financial institutions
- OFAC penalty announcements
- Blocked entities and individuals

**Use Case:**
- Reputational risk from sanctions violations
- Board-level concerns when institution fined by OFAC
- Tracks foreign exposure risks

**API Access:** XML download available (https://www.treasury.gov/ofac/downloads/sdnlist.xml)

**Data Fields:**
- SDN name and aliases
- Program (e.g., Russia, Iran, North Korea)
- Remarks and vessel info
- Enforcement actions and penalties (separate feed)

---

### FTC Consumer Protection
**URL:** https://www.ftc.gov/enforcement/cases-proceedings
**Type:** Consumer Fraud & Data Breach
**Update Frequency:** Weekly
**Cost:** Free
**Integration Priority:** MEDIUM

**What It Provides:**
- Consumer fraud enforcement actions
- Data breach notifications (financial institutions)
- Unfair/deceptive practices cases
- Privacy violations

**Use Case:**
- Tracks data breach incidents before they become public
- Consumer fraud patterns (overdraft fees, credit card marketing)
- Regulatory scrutiny on fintech partnerships

**API Access:** RSS feeds available, no formal API

**Data Fields:**
- Company name
- Case type (data breach, unfair practices, privacy)
- Action date
- Settlement amount
- Description

---

### EPA Enforcement & Superfund Sites
**URL:** https://echo.epa.gov/
**Type:** Environmental Violations
**Update Frequency:** Quarterly
**Cost:** Free
**Integration Priority:** LOW

**What It Provides:**
- Environmental violations (Clean Water Act, Clean Air Act)
- Superfund site designations
- Enforcement actions and penalties
- Toxic release inventory

**Use Case:**
- ESG risk for banks with CRE/commercial lending exposure to polluters
- Reputational risk from financing environmentally damaging projects
- Climate transition risk assessment

**API Access:** Yes — EPA Envirofacts API (https://www.epa.gov/enviro/web-services)

**Data Fields:**
- Facility name and location
- Violation type
- Penalty amount
- Superfund status

---

### OSHA Violations Database
**URL:** https://www.osha.gov/pls/imis/establishment.html
**Type:** Workplace Safety
**Update Frequency:** Weekly
**Cost:** Free
**Integration Priority:** LOW

**What It Provides:**
- Workplace safety violations
- Fatalities and serious injuries
- Citation amounts
- Repeat violators

**Use Case:**
- ESG risk for banks financing companies with poor safety records
- Reputational risk from lending to dangerous employers
- Social pillar of ESG scoring

**API Access:** No — web scraping required

**Data Fields:**
- Establishment name
- Violation type (serious, willful, repeat)
- Citation amount
- Inspection date
- Injury/fatality details

---

### NY DFS Enforcement Actions
**URL:** https://www.dfs.ny.gov/reports_and_publications/press_releases
**Type:** State Banking Regulator
**Update Frequency:** Monthly
**Cost:** Free
**Integration Priority:** MEDIUM

**What It Provides:**
- NY banking enforcement actions
- Consent orders for NY-chartered banks
- Virtual currency enforcement
- Insurance violations (if applicable)

**Use Case:**
- Critical for banks with significant NY presence
- NYDFS is most aggressive state regulator
- Cybersecurity violations (Part 500 compliance)

**API Access:** No — RSS feed available

**Data Fields:**
- Institution name
- Action type (consent order, prohibition order)
- Violation description
- Penalty amount
- Action date

---

### CA DFPI Enforcement Actions
**URL:** https://dfpi.ca.gov/enforcement/
**Type:** State Banking & Lending Regulator
**Update Frequency:** Monthly
**Cost:** Free
**Integration Priority:** MEDIUM

**What It Provides:**
- CA banking enforcement actions
- Fintech/lending enforcement (TILA, ECOA violations)
- Consumer finance violations
- Money transmitter enforcement

**Use Case:**
- Critical for banks with CA operations
- Tracks fintech partner risks
- Predatory lending enforcement

**API Access:** No — web scraping required

**Data Fields:**
- Entity name
- Action type
- Violation statute
- Penalty amount
- Settlement terms

---

## Phase 3: Premium/Paid Sources (💰 Requires Budget)

| Source | Type | Cost | Priority |
|--------|------|------|----------|
| **RepRisk AG** | ESG & Reputation | $50K-$200K/yr | HIGH |
| **MSCI ESG Ratings** | ESG Scores | $100K+/yr | MEDIUM |
| **Sustainalytics** | ESG Risk Ratings | $75K-$150K/yr | MEDIUM |
| **Dow Jones Risk & Compliance** | Sanctions, PEP, Watchlists | Custom pricing | MEDIUM |
| **LexisNexis Corporate Affiliations** | Ownership & Relationships | Custom pricing | LOW |
| **Bloomberg ESG Data** | ESG Metrics | Included w/ Terminal | HIGH (if Terminal access) |

---

## Implementation Priorities

### Immediate (Next 2 weeks)
1. ✅ **CFPB** — Already integrated
2. ✅ **GDELT** — Already integrated
3. **FinCEN** — BSA/AML enforcement (web scraping or RSS)

### Short-term (1-2 months)
4. **OFAC SDN** — XML download integration
5. **NY DFS** — RSS feed integration
6. **CA DFPI** — Web scraping integration
7. **FTC** — RSS feed integration

### Medium-term (3-6 months)
8. **EPA Envirofacts API** — Environmental violations
9. **OSHA** — Workplace safety (web scraping)
10. Backend proxy for SEC/OCC/FDIC (bypass CORS)

### Long-term (6-12 months)
11. Premium sources evaluation (RepRisk, MSCI, Sustainalytics)
12. Real-time news sentiment (beyond NewsAPI free tier)
13. Social media sentiment (Twitter/Reddit API)

---

## Technical Implementation Notes

### Backend Proxy Required
Several sources are blocked by CORS when called from browser:
- SEC EDGAR
- OCC Enforcement
- FDIC Enforcement
- Federal Reserve Enforcement

**Solution:** Create Next.js API routes to proxy these requests server-side.

### Web Scraping vs. APIs
Many government sources don't have formal APIs:
- FinCEN — RSS feed or scraping
- FTC — RSS feeds available
- OSHA — Scraping required
- NY DFS — RSS feed
- CA DFPI — Scraping required

**Solution:** Build scheduled scraper jobs (daily/weekly) that populate a backend database.

### Rate Limits & Caching
- CFPB API: No rate limit, but cache responses (1 hour)
- GDELT API: No rate limit, but large responses — cache aggressively
- NewsAPI: 100 requests/day (free tier) — backend caching essential

---

## Data Quality Considerations

### CFPB Complaint Data
**Strengths:** Real-time, comprehensive, free
**Limitations:** Consumer-submitted (unverified), narrative quality varies, duplicate complaints
**Mitigation:** De-duplicate by complaint ID, filter for substantive narratives (>100 chars)

### GDELT News Coverage
**Strengths:** 150K+ sources globally, real-time
**Limitations:** No sentiment scoring (need to add NLP), quality varies by source
**Mitigation:** Use FinBERT or similar model for sentiment, filter to reputable sources

### Enforcement Action Data (OCC/FDIC/Fed/FinCEN)
**Strengths:** Authoritative, high-signal
**Limitations:** Lag time (30-90 days), no API, inconsistent formatting
**Mitigation:** Scrape monthly, normalize to common schema

### State Regulator Data (NY DFS, CA DFPI)
**Strengths:** Early warning (state actions often precede federal)
**Limitations:** No standardization across states, manual scraping
**Mitigation:** Focus on 2-3 key states (NY, CA, TX)

---

## ROI Analysis

### Free Sources (Phase 2)
**Total Integration Cost:** ~40 hours engineering
**Ongoing Maintenance:** ~4 hours/month
**Value:** 7 new regulatory/enforcement data sources
**ROI:** High (no marginal cost, significant data expansion)

### Premium Sources (Phase 3)
**Annual Cost:** $50K-$200K (RepRisk, MSCI, or Sustainalytics)
**Value:** Professional ESG ratings, normalized scores, API access
**ROI:** Depends on customer willingness to pay (enterprise SaaS pricing)

---

## Recommended Next Steps

1. **Create backend proxy** for SEC/OCC/FDIC/Fed enforcement data (2-3 days)
2. **Build FinCEN scraper** for BSA/AML enforcement (2 days)
3. **Integrate OFAC SDN XML** download (1 day)
4. **Add state regulator RSS feeds** (NY DFS, CA DFPI) (2 days)
5. **Evaluate premium source trials** (RepRisk, MSCI, Sustainalytics) (1 week)

**Total Effort for Phase 2:** ~2 weeks full-time engineering

---

*Last updated: 2026-02-06*

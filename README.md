# CampusReach

**AI-powered student support triage platform** built on the *No Wrong Door* model — a student in distress tells us what's going on, the system figures out who they should talk to, and they never have to repeat their story.

---

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 15 classifier + 8 stage engine tests
npm run build     # production build
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

```
VITE_GEMINI_API_KEY=...    # optional — Gemini 1.5 Flash for AI classification
VITE_AI_PROXY_URL=...      # optional — custom AI proxy endpoint
```

The app works fully with **zero API keys** — rules-based classification and template explanations are used as fallback.

---

## Demo accounts

See [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) for login credentials.

---

## Architecture

```
src/
├── components/
│   ├── auth/          LoginScreen (unified sign-in + register)
│   ├── chat/          ChatWidget (AI support chatbot)
│   ├── intake/        IntakeScreen, ProcessingScreen
│   ├── result/        ResultScreen, CrisisScreen, HandoffScreen
│   ├── shared/        AppHeader, InactivityDialog, NotificationCenter
│   ├── staff/         StaffQueue, StaffView, StaffLogin (legacy redirect)
│   ├── student/       MyRequests, RequestDetail
│   ├── admin/         AdminInsights
│   └── ui/            shadcn-style primitives (Button, Card, Badge, …)
├── config/
│   ├── contacts.ts    Crisis line numbers, campus contacts
│   └── crisisLexicon.ts  Crisis keyword list (EN + Hinglish)
├── data/
│   └── staffDirectory.ts  Staff members + department locations
├── lib/
│   ├── aiClient.ts    Gemini API client, PII redaction, response cache
│   ├── AppContext.tsx  Global state + all actions
│   ├── auth.ts        Mock auth, SHA-256 registration, lockout, session expiry
│   ├── classify.ts    Hybrid pipeline: rules → AI → human triage
│   ├── mockCases.ts   Seed data (10 cases incl. Riya × 3, Arjun × 1)
│   ├── routing.ts     Department routing table + Gemini explanation
│   ├── scoring.ts     Legacy rules scorer (used as reference)
│   ├── stages.ts      Pure stage-engine: getStages(caseRecord) → Stage[]
│   └── store.ts       localStorage data layer, BroadcastChannel cross-tab sync
└── types/
    └── index.ts       CaseRecord v3, UserSession, all shared types
```

## Classification pipeline

```
Student text
  → 1. Normalise + PII redact
  → 2. Crisis lexicon (EN + Hinglish) — authoritative, AI cannot lower this
  → 3. Dictionary scoring (150+ rules) + admin overrides from localStorage
  → 4. Confidence check — high → source = "rules"
  → 5. Low confidence → Gemini 1.5 Flash (strict JSON, temp=0, validated)
  → 6. AI unavailable / confidence < 0.6 → Human triage fallback
```

## Roles

| Role | Landing after login | Key screens |
|---|---|---|
| Guest | Intake | Intake → Result → (no send) |
| Student | Intake | Intake → Result → Handoff → My Requests |
| Staff | Queue | Queue → Case Detail |
| Admin | Queue | Queue → Case Detail → Insights |

## Case lifecycle

```
Submitted → Triaged → Assigned → Appointment Offered → Resolved
                                                      → Withdrawn (any time before first view)
```

Crisis path: `Alert Sent → Acknowledged → Counsellor Contacting → Follow-up`

---

## Key design decisions

- **No black box**: every routing decision traces back to specific matched keywords shown to the student and staff
- **Rule-based + AI hybrid**: deterministic rules handle ~80% of cases; AI handles unusual phrasing; humans handle the rest
- **Crisis never requires login**: guests always get the full crisis screen
- **Zero API keys required**: full functionality without Gemini key; AI classification is an enhancement
- **Privacy first**: PII (emails, phones, ID numbers) is redacted before any AI call; students choose what gets forwarded

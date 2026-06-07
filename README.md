# FamilyPlate

> One pot on the stove. Everyone's plate matches their goal.

A weekly family meal planner that generates 21 meals (breakfast, lunch, dinner × 7 days) as **one base dish per slot with per-person modifiers** — catering to every diet, age, and goal in the household simultaneously. Grocery list aggregated and ready for the weekend shop.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Firebase Setup](#firebase-setup)
5. [AI Provider Setup](#ai-provider-setup)
6. [Local Development](#local-development)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Deploying to Vercel](#deploying-to-vercel)
9. [Vercel Cron — Friday Auto-Generation](#vercel-cron--friday-auto-generation)
10. [Weekly Menu Variety — How It Works](#weekly-menu-variety--how-it-works)
11. [Project Structure](#project-structure)
12. [Switching AI Providers](#switching-ai-providers)

---

## Features

- **Conversational onboarding** — describe your family in plain text; the AI extracts structured profiles
- **One dish, many goals** — base dish built to the strictest constraint; indulgences added per-person at serving time
- **21-slot weekly plan** — breakfast, lunch, dinner for 7 days
- **Never repeats menus** — week history tracked in Firestore; cuisine rotation seeded by week number
- **Allergy safety enforced in code** — not trusted to the model alone
- **Aisle-grouped grocery list** — auto-aggregated from all 21 slots, check-off in-store
- **Friday auto-generation** — Vercel Cron fires every Friday at 13:00 UTC; users get a notification
- **Model-agnostic AI** — switch between Anthropic, OpenAI, and Gemini via one env var
- **4 visual themes** — Warm Kitchen, Fresh Market, Midnight Pantry, Spice Route (CSS-variable crossfade)
- **Framer Motion animations** — staggered card reveals, slot expansions, lock celebration
- **Mobile-first, senior-friendly** — large tap targets, high contrast, offline grocery list

---

## Architecture

```
Browser (Next.js / React)
  ↕ Firebase Auth (Google SSO)
  ↕ ID token / fetch

Vercel Serverless Functions (Next.js Route Handlers)
  /api/onboard      — LLM profile extraction
  /api/generate     — Full 21-slot week generation
  /api/swap         — Single-slot regeneration
  /api/grocery      — Grocery fetch / check-off
  /api/cron/weekly  — Friday auto-generation (Vercel Cron)
        ↕
  AI Provider (Anthropic / OpenAI / Gemini via Vercel AI SDK)
        ↕
  Firestore (users, family profiles, plans, grocery, feedback)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS or later |
| npm | 10+ |
| Firebase project | Free Spark plan is fine for development |
| AI provider API key | Anthropic (default), OpenAI, or Gemini |
| Vercel account | For deployment and Cron |

---

## Firebase Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Name it (e.g. `familyplate-prod`). Disable Google Analytics if you don't need it.
3. Click **Create project**.

### 2. Enable Google Authentication

1. In the Firebase Console, go to **Authentication → Sign-in method**.
2. Enable **Google** provider.
3. Add your domain to **Authorised domains** (add `localhost` for dev; add your Vercel domain for prod).

### 3. Create a Firestore database

1. Go to **Firestore Database → Create database**.
2. Choose **Start in production mode** (rules are set below).
3. Select a region close to your users.

### 4. Deploy Firestore Security Rules

From your project root:

```bash
npm install -g firebase-tools   # one-time install
firebase login
firebase use --add              # select your project
firebase deploy --only firestore:rules
```

The rules file at `firestore.rules` ensures users can only read/write their own data.

### 5. Get client-side Firebase config

1. Firebase Console → **Project Settings → General → Your apps**.
2. Click **Add app → Web**.
3. Register the app (name it `FamilyPlate Web`).
4. Copy the `firebaseConfig` object values into your `.env.local` as `NEXT_PUBLIC_FIREBASE_*` vars.

### 6. Get Admin SDK credentials (server-side)

1. Firebase Console → **Project Settings → Service accounts**.
2. Click **Generate new private key** → download the JSON file.
3. Copy values into `.env.local`:
   - `FIREBASE_ADMIN_PROJECT_ID` ← `project_id`
   - `FIREBASE_ADMIN_CLIENT_EMAIL` ← `client_email`
   - `FIREBASE_ADMIN_PRIVATE_KEY` ← `private_key` (paste the full value including `-----BEGIN...-----END...`, with literal `\n` characters — do **not** replace them)

---

## AI Provider Setup

### Anthropic (default)

1. Sign up at [console.anthropic.com](https://console.anthropic.com).
2. Create an API key under **API Keys**.
3. Set `ANTHROPIC_API_KEY` and leave `AI_PROVIDER=anthropic`.

The default model is `claude-sonnet-4-6` (balanced speed/quality for weekly generation). Change `ANTHROPIC_MODEL` to `claude-opus-4-6` for harder edge cases (higher cost).

### OpenAI

1. Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL=gpt-4o`.

### Google Gemini

1. Create a key at [aistudio.google.com](https://aistudio.google.com).
2. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemini-1.5-pro`.

> **Tip:** Model strings change over time. Check your provider's docs at deploy time. Switching providers or models requires only env var changes — no code changes.

---

## Local Development

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd familyplate

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# Then fill in all values in .env.local (see section below)

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Type-check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Test the cron endpoint locally

```bash
# Set CRON_SECRET=mysecret in .env.local, then:
curl -H "Authorization: Bearer mysecret" http://localhost:3000/api/cron/weekly
```

---

## Environment Variables Reference

Copy `.env.example` to `.env.local` and populate every value.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase client config |
| `FIREBASE_ADMIN_PROJECT_ID` | ✅ | Service account — project id |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | ✅ | Service account — client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | ✅ | Service account — private key (with literal `\n`) |
| `AI_PROVIDER` | ✅ | `anthropic` \| `openai` \| `gemini` |
| `ANTHROPIC_API_KEY` | If using Anthropic | — |
| `ANTHROPIC_MODEL` | — | Default: `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | If using OpenAI | — |
| `OPENAI_MODEL` | — | Default: `gpt-4o` |
| `GEMINI_API_KEY` | If using Gemini | — |
| `GEMINI_MODEL` | — | Default: `gemini-1.5-pro` |
| `CRON_SECRET` | ✅ | Long random string protecting the cron endpoint |
| `KV_REST_API_URL` | Optional | Vercel KV / Upstash Redis for cron locking |
| `KV_REST_API_TOKEN` | Optional | — |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` (dev) or your Vercel URL (prod) |

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Framework: **Next.js** (auto-detected).
4. Root directory: leave as `/` (unless you put the project in a subdirectory).

### 3. Set environment variables

In the Vercel project → **Settings → Environment Variables**, add every variable from your `.env.local`. Mark `NEXT_PUBLIC_*` as available to all environments; mark secrets as **Production** (and optionally Preview).

For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the raw value exactly — Vercel handles multi-line secrets correctly.

### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically.

### 5. Add your Vercel domain to Firebase Auth

Firebase Console → **Authentication → Sign-in method → Authorised domains** → add your `*.vercel.app` domain (and your custom domain if you have one).

### 6. Redeploy Firestore rules for production

```bash
firebase use <your-prod-project-id>
firebase deploy --only firestore:rules
```

---

## Vercel Cron — Friday Auto-Generation

`vercel.json` configures a cron job:

```json
{
  "crons": [
    { "path": "/api/cron/weekly", "schedule": "0 13 * * 5" }
  ]
}
```

This fires every **Friday at 13:00 UTC** (≈ Friday morning US Eastern). Adjust the schedule to match your primary audience's timezone.

**How it works:**
1. Vercel calls `/api/cron/weekly` with an `Authorization: Bearer <CRON_SECRET>` header.
2. The handler acquires a Firestore lock (prevents double-firing on retries).
3. For each active user who hasn't had next week generated yet, it calls the AI layer and persists the draft plan.
4. TODO: add push notification / email after the plan is saved (hook marked in the code).

**Cron on Vercel Free plan:** Vercel's free plan supports 2 cron jobs with a minimum interval of 1 day — sufficient for this use case. For higher frequency, upgrade to Pro.

**Scaling:** The current implementation loops through up to 100 users inline. For larger user bases, replace the loop with a job queue (Vercel Queue, Upstash QStash, or Google Cloud Tasks).

---

## Weekly Menu Variety — How It Works

Ensuring users never see the same menus repeated is handled at three layers:

### 1. Dish history in the prompt (strongest signal)

Before every generation, `generateWeek.ts` fetches the last **4 weeks** of plan documents from Firestore and extracts every dish title. These are passed to the model as a "DO NOT REPEAT" list:

```
RECENT DISH HISTORY (DO NOT REPEAT ANY OF THESE):
  - Palak Dal Tadka
  - Chicken Tacos
  - Miso Soup with Tofu
  ...
```

The system prompt also explicitly prohibits intra-week dish title repetition.

### 2. Week-number cuisine rotation (structural variety)

`buildCuisineRotation()` in `prompts.ts` uses the ISO week number as a rotation offset, so the cuisine lineup shifts each week:

- Week 24 might start: South Indian, Thai, Mediterranean, Mexican…
- Week 25 starts from a different point in the rotation.

Cuisines used recently are de-prioritised so the rotation isn't circular.

### 3. Duplicate detection + retry

After generation, `findDuplicateDishes()` checks for intra-week title collisions. If any are found, the generation retries (up to 2 attempts) with the duplicates added to the "avoid" list and a slightly higher temperature.

### Summary

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| History blacklist | Recent dish titles → model prompt | Cross-week |
| Cuisine rotation | Week-number seed → ordered cuisine list | Cross-week |
| Intra-week dedup | Post-generation check + retry | Within week |

---

## Project Structure

```
familyplate/
├── firestore.rules              # Firestore security rules
├── vercel.json                  # Cron schedule
├── .env.example                 # Env var template
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (providers, font)
│   │   ├── page.tsx             # Landing / login page
│   │   ├── globals.css          # CSS custom property themes + Tailwind
│   │   ├── (app)/               # Authenticated routes
│   │   │   ├── layout.tsx       # Auth guard + AppNav
│   │   │   ├── plan/page.tsx    # Weekly plan view (main screen)
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── grocery/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── onboard/route.ts
│   │       ├── generate/route.ts
│   │       ├── swap/route.ts
│   │       ├── grocery/route.ts
│   │       └── cron/weekly/route.ts
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider.ts      # Model-agnostic provider switch
│   │   │   ├── schema.ts        # Zod schema (WeekSchema, SlotSchema, …)
│   │   │   ├── prompts.ts       # System prompts + prompt builders
│   │   │   ├── generateWeek.ts  # Week + slot generation (history-aware)
│   │   │   └── safety.ts        # Hard-constraint enforcement in code
│   │   ├── firebase/
│   │   │   ├── client.ts        # Firebase client SDK (browser)
│   │   │   └── admin.ts         # Firebase Admin SDK (server only)
│   │   ├── grocery.ts           # Grocery aggregation utility
│   │   └── cn.ts                # Tailwind class merge helper
│   ├── components/
│   │   ├── ui/
│   │   │   └── AppNav.tsx       # Top bar + mobile tab bar
│   │   └── plan/
│   │       ├── DayCard.tsx      # One day with 3 meal slots
│   │       ├── MealSlot.tsx     # Expandable meal card
│   │       └── GroceryList.tsx  # Aisle-grouped check-off list
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Firebase auth state
│   │   └── ThemeContext.tsx     # Theme selection + persistence
│   ├── hooks/
│   │   ├── useWeekPlan.ts       # Firestore real-time plan subscription
│   │   └── useFamily.ts         # Firestore real-time family subscription
│   └── types/
│       └── index.ts             # Shared TypeScript types
```

---

## Switching AI Providers

No code changes needed. Update two env vars and redeploy:

```bash
# Switch to OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Switch to Gemini
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-pro

# Back to Anthropic (default)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The provider abstraction in `src/lib/ai/provider.ts` handles the rest.

---

## Phased Roadmap

| Phase | Features |
|-------|----------|
| **MVP (v1 — this repo)** | Google sign-in, conversational onboarding, 21-slot generation, hard-constraint safety, grocery list, Friday cron, review & lock, swap-a-slot, multi-theme |
| **v2** | Pantry check before lock, batch-cook/leftovers suggestions, calendar awareness (busy nights from connected calendar), feedback learning (thumbs + cooked tracking), nutrition rollups |
| **v3** | Grocery-delivery handoff (agentic), budget mode, family multi-device sharing, photo-of-fridge pantry intake |

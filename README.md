# Bridge Coach

A Bridge card game teaching app that helps complete beginners learn through interactive lessons and coached gameplay with AI partners and opponents.

**[Play Now](https://jinsoowhang.github.io/bridge-game-coach/)**

## What It Does

Play Bridge against AI opponents while receiving real-time coaching. Start with bite-sized lessons, then jump into coached games where the AI explains every decision.

### Coached Gameplay
- Play as South with an AI partner (North) against AI opponents (East/West)
- **Coaching hints** — automatic suggestions for every bid and play with plain English explanations
- **Tiered learning** — hints start always-on, then transition to an on-demand "Hint" button after 5 hands
- **Dummy control** — when you're declarer, play both your hand and dummy's cards

### Interactive Lessons
- **5 beginner lessons** — Card Basics, Tricks, Trump, Counting Points, Opening Bids
- **Tap-to-answer exercises** — immediate feedback with explanations after each concept
- **Progress tracking** — pick up where you left off, replay any lesson

### Game Engine
- Full Bridge rules — dealing, bidding (Standard American), trick play, scoring
- AI bidding with SAYC conventions (openings + responses)
- AI play engine — 2nd hand low, 3rd hand high, cover honors, trump management
- Defense engine — 4th best leads vs NT, top of sequence vs suit contracts

## Tech Stack

| Layer | Technology |
|---|---|
| Engine | Pure TypeScript (zero DOM dependencies) |
| Frontend | React 19, Vite 7, Tailwind CSS v4, Zustand |
| Routing | React Router 7 |
| Testing | Vitest (400 tests across 26 files) |
| CI/CD | GitHub Actions → GitHub Pages |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  @bridge-coach/engine (pure TypeScript)         │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │ GameLoop │→ │ BridgeState│→ │  Coaching  │  │
│  └──────────┘  └────────────┘  └────────────┘  │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Deck    │  │  Auction   │  │ AI Engines │  │
│  └──────────┘  └────────────┘  └────────────┘  │
└────────────────────┬────────────────────────────┘
                     │ Async Providers (Bid/Play)
┌────────────────────▼────────────────────────────┐
│  @bridge-coach/client (React)                   │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │GameStore │  │ Settings   │  │ Lessons    │  │
│  │(Zustand) │  │  Store     │  │  Store     │  │
│  └────┬─────┘  └─────┬──────┘  └─────┬──────┘  │
│       │              │               │          │
│  ┌────▼──────────────▼───────────────▼────────┐ │
│  │  Pages: Home | Play | Lessons              │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

The engine is completely DOM-free and uses async `BidProvider`/`PlayProvider` callbacks that the React client bridges via a Promise-resolver pattern in Zustand. Human input creates a Promise; tapping a card or bid resolves it and lets the engine continue.

## Coaching System

The coaching module generates plain English hints for every decision:

- **Bidding hints** — "You have 13 HCP with 4 hearts — raise to 3♥ (limit raise)"
- **Play hints** — "Second hand low — play the 4♦" or "Partner is winning — follow with your lowest"
- **Always-on mode** — hints appear automatically (default for beginners)
- **Hint-button mode** — tap "Hint" when you want help (suggested after 5 hands)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run engine tests
npm run test:engine

# Production build
npm run build
```

No environment variables needed — everything runs client-side with localStorage for progress.

## Built With

Built with [Claude Code](https://claude.ai/claude-code).

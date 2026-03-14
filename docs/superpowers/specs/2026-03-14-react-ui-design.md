# Bridge Game Coach — React UI Design Spec

## Overview

React frontend for a Bridge card game teaching app. NW (complete beginner) plays as South with AI partners/opponents, coached gameplay with tiered hints, and 5 structured lessons. The engine (Phase 1) is complete with 200 tests passing — this spec covers the client UI that consumes it.

**Stack:** React 19, Vite, Tailwind v4, Zustand, React Router
**Target:** Mobile-first (portrait-primary, responsive to landscape), deployed to GitHub Pages
**Visual style:** Warm classic — deep green felt, gold accents, cream-colored cards with traditional red/black pips

---

## Pages & Navigation

### Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | HomePage | Landing — two cards: "Learn Bridge" and "Play Bridge" |
| `/play` | PlayPage | Bridge table — full game experience |
| `/lessons` | LessonsPage | List of 5 lessons with progress indicators |
| `/lessons/:id` | LessonPage | Individual lesson with explanation + interactive exercises |

### Navigation

- Minimal top bar on all pages: app name ("Bridge Coach") + back/home link
- On PlayPage, nav collapses to a small home icon to maximize table space
- No hamburger menu — simple breadcrumb-style nav

### Flow

- HomePage → "Play Bridge" → PlayPage (starts a new hand immediately)
- HomePage → "Learn Bridge" → LessonsPage → tap lesson → LessonPage
- After hand completes → HandSummaryModal → "Next Hand" or "Back to Home"

---

## Stores

### useGameStore (Zustand)

Central store that owns the GameLoop instance.

**State:**
- `gameState: BridgeState | null` — current engine state, updated on every event
- `phase: 'idle' | 'bidding' | 'playing' | 'scoring' | 'complete'` — `'idle'` is UI-only (before `startHand()` is called); the rest map to engine's `BridgePhase`
- `pendingAction: { type: 'bid' | 'play', validChoices: Bid[] | Card[] } | null` — set when engine awaits human input
- `coachingHint: BiddingHint | PlayHint | null` — current hint if coaching is on (`BiddingHint.suggestion` is a `Bid`, `PlayHint.suggestion` is a `Card`; both have `explanation: string`)
- `handHistory: { contract, result, score }[]` — running history of hands played

**Actions:**
- `startHand()` — creates a GameLoop with a single `getBid`/`getPlay` provider that dispatches internally: for N/E/W, calls the AI engine (`selectBid`/`selectPlay`); for South (and dummy when South is declarer), returns a Promise that the UI resolves. Calls `playHand()`.
- `resolve(choice)` — resolves the pending Promise, letting the engine continue
- `requestHint()` — during bidding, calls `getBiddingHint(position, state.hands[position], state.auction, state.dealer)`; during play, calls `getPlayHint(position, state.hands[position], pendingAction.validChoices, state)`

**Promise-resolver pattern:**
1. Engine calls `getBid(South)` or `getPlay(South)`
2. Store sets `pendingAction` with valid choices
3. Store sets `coachingHint` (if always-on mode)
4. Store returns a new Promise
5. UI renders choices — user taps one → calls `resolve(choice)`
6. Promise resolves → engine continues

**AI turn pacing:** AI bids/plays resolve instantly from the engine. The `onEvent` handler introduces a 300-500ms delay before updating state for AI actions so NW can follow the flow.

**Dummy control:** The engine calls `getPlay(South, validCards, state)` for both South's own turns and dummy's turns (when South is declarer). The store distinguishes them by checking `state.currentPlayer === state.dummy`. When true, the UI renders dummy's cards as tappable instead of South's hand.

### useSettingsStore (Zustand, localStorage-persisted)

- `coachingMode: 'always-on' | 'hint-button'` — defaults to `'always-on'`
- `handsPlayed: number` — after 5 hands, prompt user to switch to hint-button mode

### useLessonStore (Zustand, localStorage-persisted)

- `completedLessons: string[]` — IDs of completed lessons
- `currentExercise: Record<string, number>` — progress within each lesson

---

## Component Tree

### PlayPage

```
PlayPage
├── GameHeader          — home icon, contract display, vulnerability badge
├── BridgeTable         — green felt table, square layout
│   ├── PlayerPosition  — ×4 (N/E/S/W), shows name + trick count
│   ├── TrickArea       — center diamond, shows 4 cards of current trick
│   └── DummyHand       — North's face-up cards (after auction)
├── PlayerHand          — South's cards as a fan at bottom, tappable
├── BiddingBox          — bid button grid (1C–7NT + Pass/Dbl/Rdbl)
├── BiddingHistory      — 4-column auction record (N/E/S/W), collapsible
├── CoachingBubble      — hint text above hand or bidding box
└── HandSummaryModal    — post-hand: contract result, score, one-line takeaway
```

### HomePage

```
HomePage
├── AppTitle            — "Bridge Coach" with suit motif
├── PathCard ("Learn")  — links to /lessons, shows progress
└── PathCard ("Play")   — links to /play, shows hands played
```

### LessonsPage / LessonPage

```
LessonsPage
├── LessonCard ×5       — title, description, progress badge

LessonPage
├── LessonHeader        — title, progress dots
├── ContentBlock        — explanation text with inline card/bid examples
├── ExerciseBlock       — interactive tap-to-answer with immediate feedback
└── LessonNav           — back/next buttons
```

---

## Layout (Portrait-Primary Mobile)

### PlayPage zones (portrait)

| Zone | Height | Content |
|---|---|---|
| GameHeader | ~5% | Contract, vulnerability badge, home icon |
| BridgeTable | ~55% | N/E/W positions, trick area (center diamond), dummy's cards |
| CoachingBubble | ~10% | Hint text (when active) |
| Bottom zone | ~30% | BiddingBox during auction, PlayerHand during play |

### Key layout decisions

- **BiddingBox vs PlayerHand** swap in the same bottom zone based on phase
- **DummyHand** at North position, face-up, sorted by suit
- **E/W hands** hidden — show position label + trick count only, face-down card backs
- **TrickArea** uses diamond pattern matching N/S/E/W positions
- **Cards appear** as played, clear after trick completes with ~800ms pause
- **Landscape** gets wider layout with more horizontal space but portrait never feels broken

### BiddingBox layout

- 5-column grid: suits across (C/D/H/S/NT), levels down (1-7)
- BiddingBox renders all 38 possible bids; those present in `pendingAction.validChoices` are enabled, the rest are grayed out (opacity 0.4)
- Coach-recommended bid highlighted with gold background
- Pass/Dbl/Rdbl as full-width buttons below the grid
- Dbl/Rdbl grayed when not valid

### PlayerHand layout

- Cards displayed as a horizontal fan, sorted by suit (S/H/D/C)
- Valid cards at full opacity, invalid cards dimmed
- Coach-recommended card gets a gold border highlight
- Tapping a card calls `resolve(card)`

---

## Visual Style

### Color palette

- **Felt background:** `#0d3518` (dark green) to `#1e6b34` (radial gradient)
- **Table border:** `#2a5a3a` with inset shadow
- **Gold accents:** `#c4a35a` (labels, highlights, coaching border)
- **Card face:** `#fffef5` (cream) with `#ddd` border
- **Red pips (hearts/diamonds):** `#c41e3a`
- **Black pips (spades/clubs):** `#000`
- **Coaching bubble:** `rgba(196,163,90,0.15)` background, `#c4a35a` border
- **Header bar:** `rgba(0,0,0,0.3)` overlay
- **Text on felt:** `#c4a35a` (gold) for labels, `#e8d5a0` (light gold) for content
- **Vulnerability badge:** `#8b0000` background for vulnerable, `#555` for not vulnerable

### Typography

- Serif font (Georgia) for position labels and card text — classic card room feel
- Sans-serif for UI elements (coaching text, buttons, navigation)

---

## Coaching System

### Tiered coaching

- **Always-on mode** (default): Hints appear automatically before every bid/play decision. The coaching bubble shows suggestion + plain English explanation. Recommended choice is highlighted.
- **Hint-button mode**: A "Hint" button replaces automatic hints. NW taps when she wants help.
- After 5 hands played, prompt: "You've played 5 hands! Want to try without automatic hints?" — user can accept or dismiss.
- Switchable anytime in settings.

### Coaching bubble

- Appears between the table and the bottom zone
- Shows a lightbulb icon + "Coach:" prefix
- Text from `getBiddingHint()` or `getPlayHint()` engine functions
- In hint-button mode, shows only when user taps "Hint"

---

## Lesson System

### Structure

Each lesson follows the pattern: explanation block → exercise → explanation → exercise → completion.

- **Explanation blocks:** 2-3 short paragraphs with inline card/bid visuals. 30 seconds of reading max before an exercise.
- **Exercises:** Interactive tap-to-answer. Immediate feedback (correct/incorrect with explanation).
- **Progress:** Dots at top showing blocks completed. Saved to localStorage.
- **No gating:** All 5 lessons accessible from the start. Completed lessons show a checkmark. Lessons can be replayed.

### The 5 lessons

| # | Title | Teaches | Exercise type |
|---|---|---|---|
| 1 | Card Basics | Suits, ranks, suit ranking (C < D < H < S) | "Which suit ranks higher?" — tap one of two |
| 2 | Tricks | What's a trick, follow-suit, who wins | "Who wins this trick?" — show 4 cards, tap winner |
| 3 | Trump | Trump suit, ruffing, trump beats non-trump | "Does this trump beat the Ace?" — yes/no |
| 4 | Counting Points | HCP (A=4 K=3 Q=2 J=1), distribution points | "How many points?" — tap correct number |
| 5 | Opening Bids | When to open, 1-suit vs 1NT vs strong 2C | "What would you bid?" — mini bidding box |

---

## Post-Hand Review

Quick summary modal — keep momentum:

- Contract result: "Made 4♥ +1" or "Down 2 in 3NT"
- Score: "+420" or "-100"
- **[Next Hand]** button (prominent)
- **[Back to Home]** button (secondary)

---

## Data Flow Summary

```
startHand() → GameLoop created → playHand()
  → HAND_DEALT → store updates → UI renders cards
  → AWAITING_BID (AI) → 300ms delay → auto-resolve → BID_MADE
  → AWAITING_BID (South) → pendingAction set → BiddingBox renders → user taps → resolve()
  → ... auction continues until complete

  If all four pass (no contract):
  → HAND_COMPLETE with score 0 → HandSummaryModal shows "All passed — no contract" → Next Hand

  If contract is reached:
  → AUCTION_COMPLETE → contract set
  → DUMMY_REVEALED → DummyHand shows North's cards
  → AWAITING_PLAY (AI) → 300ms delay → auto-resolve → CARD_PLAYED
  → AWAITING_PLAY (South/Dummy) → pendingAction set → PlayerHand/DummyHand → user taps → resolve()
  → TRICK_COMPLETE → 800ms display → clear → next trick
  → HAND_COMPLETE → HandSummaryModal → [Next Hand] or [Home]
```

---

## Known v1 Limitations (inherited from engine)

- AI only handles openings + responses (overcalling/rebidding stubs to pass)
- Defensive signals deferred
- Some hands may end in all-pass if no partnership has a strong opening
- No backend — all state is local (localStorage for settings/progress, in-memory for game state)

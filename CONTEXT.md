# Hero Cards — Project Context for Claude Code

## What This Is
A single-file HTML superhero card collecting game. Everything lives in `index.html` — React, Firebase, CSS, card data, all components. No build system, no npm, no separate files.

## Tech Stack
- **React 18** via CDN (Babel standalone for JSX transpilation)
- **Firebase 10.13.0** — Auth (email/password), Firestore (user data), Storage (card images)
- **Single HTML file** — `index.html` (~230KB)
- **Validator** — `validate.js` (run with `node validate.js` to check for 52 known issues)

## Firebase Config
```js
apiKey: "AIzaSyCND0fQv2JUNBE4YR7bxkMuwsucnlYmH9M"
authDomain: "hero-cards-1f345.firebaseapp.com"
projectId: "hero-cards-1f345"
storageBucket: "hero-cards-1f345.firebasestorage.app"
appId: "1:270324583342:web:f72095eaf4a08f5dc2563f"
```

## Game Features
- **200 cards** in `ALL_CARDS` array (5 Legendary, 10 Epic, 30 Rare, 55 Uncommon, 100 Common)
- **2 packs**: Pack 1 "Infinite Waves" 🌊, Pack 2 "Shrouded Mysteries" 🌑
- **17 cards with Firebase Storage images** (cards #9, #11, #13, #18, #19, #21, #31, #38, #39, #58, #71, #77, #91, #102, #109, #135, #197)
- **Pack opening** with animations, Web Audio sounds, vibration API
- **Collection** with 5-col grid (2-col mobile), search, rarity/type/pack filters, sort
- **Card detail page** with 320px fill-mode card
- **Store** — Avatar Store + Card Store (daily Legendary/Epic/Rare)
- **Quests** — 3 daily quests (Easy/Medium/Hard), date-seeded
- **Achievements** — 52 tiered achievements across 14 families
- **XP/Leveling** — levels 1-100 with level-up modal and avatar unlocks
- **Avatar system** — 18 purchaseable + 20 level-up exclusive avatars
- **God Mode** — toggle on login, all 200 cards, 99999 credits, orange banner, nothing saved
- **Card CMS** — God Mode only, edit cards and upload images to Firebase Storage
- **Firebase Auth** — email/password login, username stored in Firestore

## Component Structure
```
App
├── AuthScreen
└── Game
    ├── Sidebar (desktop)
    ├── BottomNav (mobile)
    ├── Header
    ├── Home tab
    ├── Collection tab
    │   ├── HeroCard (fill=true, 2-col/5-col grid)
    │   └── MissingCard
    ├── Detail tab
    │   └── HeroCard (fill=true, 320px container, aspectRatio 201/290)
    ├── Store tab
    │   └── CardOffer → HeroCard (fill=true, 280px container, aspectRatio 201/290)
    ├── Quests tab
    ├── Achievements tab
    ├── PackAnim (portal overlay)
    ├── CardCMS (God Mode only)
    └── Modals (level-up, avatar, achievement popup)
```

## HeroCard Component — Critical Details
```js
function HeroCard({card, size="normal", onClick, selected, showShine=false, fill=false})
```

### Size presets (D table):
| size | w | h | imgH | notes |
|------|---|---|------|-------|
| tiny | 103 | 140 | 44% | |
| small | 138 | 186 | 45% | |
| normal | 201 | 269 | 46% | used everywhere with fill=true |
| large | 253 | 339 | 47% | |
| xlarge | 360 | 482 | 47% | defined but not currently used |

### Fill mode:
- `fill=true` → `position:absolute; top/left/right/bottom:0; width/height:100%`
- Uses CSS vars: `fw = "calc((100vw - var(--sidebar-w)) / var(--card-col))"`
- CSS vars: desktop `--sidebar-w:293px; --card-col:5`, mobile `--sidebar-w:0px; --card-col:2`
- **Always wrap fill cards in**: `<div style={{position:"relative", width:"...", aspectRatio:"201/290", overflow:"hidden", borderRadius:"13px"}}>`

### Card layout (top to bottom):
1. Header: `#number` + name (left), type icon circle (top-right, absolute)
2. Image window (46-47% height) with rarity-coloured border
3. Stats panel (dark bg, PWR/DEF/SPD bars + TOTAL PWR row with divider)
4. Bottom breathing room (~4% margin below stats)

### Image rendering:
- NO `crossOrigin` or `referrerPolicy` attributes (breaks Firebase Storage)
- Uses `objectFit:"cover"`, `objectPosition:"top"`
- `transform:"translateZ(0)"` + `willChange:"transform"` on both img and container for GPU compositing

### Animations:
- Idle animations (`legendaryFloat`, `epicPulse`) applied to the **wrapper div**, not HeroCard itself
- Use `box-shadow` keyframes (not `filter:drop-shadow` — gets clipped by overflow:hidden)

## State Saved to Firebase (per user)
`coins, collection, questDate, questProgress, ownedAvatars, activeAvatar, xp, earnedAchievements, packsOpened, tradesCompleted`

## Critical Rules (hard-won lessons)
1. **No `const` duplicates** — `rarities` and `types` defined once in `Game` scope only (NOT in CardCMS)
2. **No spread in JSX style objects** — use explicit props or ternaries, never `...(condition?{prop:val}:{})` inside `style={{}}`
3. **No `:undefined` CSS values** — use `...(fill?{prop:val}:{})` spread OUTSIDE style, or always provide a value
4. **No `crossOrigin` on Firebase Storage images** — breaks image loading
5. **Babel standalone** doesn't support all JS features — avoid complex patterns in JSX
6. **Template literals with `}` inside** — when adding `className` to elements with template literal styles like `border:\`2px solid ${x}\``, the `}` in the template gets misread as closing the style object. Always verify brace balance after edits.
7. **`rarities` and `types`** must be in `Game` scope, defined near the top of the component
8. **Idle animations on wrapper div** not on HeroCard itself (overflow:hidden clips them)
9. **All card wrappers use `aspectRatio:"201/290"`** — this gives breathing room below stats

## Mobile CSS
Comprehensive `@media (max-width:768px)` block covers:
- `.sidebar { display:none }` + `.bottom-nav { display:flex }`
- `.collection-grid { grid-template-columns: repeat(2,1fr) }`
- `.detail-flex { flex-direction:column }`
- Profile card: `.profile-card`, `.profile-avatar`, `.profile-username`, etc.
- All page padding, font sizes, modal sizes

## Validator (validate.js)
Run `node validate.js` — checks 52 things including:
- ALL_CARDS present with 200 cards
- All components defined
- Firebase init
- Balanced braces/parens
- No `style:undefined` values
- No spread in JSX styles
- All key features present

Always run validator after any edit. Target: 52/52 passed.

## How to Edit Safely
1. Work on `index.html` directly
2. Make targeted string replacements — find exact text, replace exactly
3. Run `node validate.js` after every change
4. Copy to output only when validator passes
5. Watch especially for brace balance when editing JSX with template literals

## Card Data
- Loaded from `ALL_CARDS` constant at top of script
- Fields: `id, name, type, rarity, power, defense, speed, emoji, desc, pack, alliance, imageUrl?`
- To update: replace the entire `const ALL_CARDS=[...]` block
- Images stored in Firebase Storage at `card-images/card_XXX.png`

## Known Quirks
- God Mode bypasses Firebase Auth → Storage uploads fail unless Storage rules allow `write: if true`
- Pack opening uses Web Audio API + Vibration API (mobile only for vibration)
- Achievement popup positioned at `bottom:80px` to clear bottom nav on mobile
- The `fw` calc variable is used for fill-mode font scaling — it correctly uses CSS vars so it works on both desktop and mobile

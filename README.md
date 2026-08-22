# Developer Portfolio Builder

A free, offline-first Android (and iOS/web) app that helps developers organize, manage, and showcase
their entire professional career in one place — profile, projects, skills, experience, resume, and a
generated portfolio website — with **no account, no cloud, no ads, and no paid APIs**.

Built with **Expo Router + TypeScript + Zustand + SQLite + React Native Paper (Material Design 3)**.

---

## ✨ Features

| Module | What it does |
|---|---|
| **Dashboard** | Stats, portfolio-readiness progress, quick actions, recent activity |
| **Profile** | Avatar, headline, bio, contact info, social links, availability status |
| **Skills Manager** | Categorized, leveled skills with search & filter |
| **Project Manager** | Rich projects: images, links, tech stack, linked skills, status, featured flag |
| **Resume Builder** | Generates a real, shareable **PDF resume** from your live data (`expo-print`) |
| **Portfolio Website Generator** | Exports a dependency-free **static HTML/CSS/JS site**, ready to host anywhere |
| **Work Experience** | Roles, responsibilities, achievements, tech stack, duration calculation |
| **Education** | Degrees, institutions, grades, ongoing/completed |
| **Certificates** | Credentials with issuer, dates, credential ID/URL |
| **Achievements** | Awards, publications, talks, competitions, open source |
| **Developer Notes** | Markdown notes with edit/preview toggle, tags, pinning, color labels |
| **Component Gallery** | Live, copyable reference of every reusable UI component in the app |
| **Learning Tracker** | Courses/books/videos with progress bars and status |
| **Interview Tracker** | Job pipeline tracking with stage history per application |
| **Career Timeline** | Auto-generated chronological visualization across all your data |
| **Developer Toolbox** | Offline utilities: JSON formatter, Base64, color converter, timestamp converter, regex tester, Lorem Ipsum generator |
| **Portfolio Checklist** | Readiness checklist with live completion tracking |
| **Search** | Instant fuzzy search across every entity in the app |
| **Backup & Restore** | Full JSON export/import — your data, portable, anytime |
| **Settings** | Light/Dark/System + 6 developer themes (GitHub, Dracula, Nord, Tokyo Night, One Dark, Catppuccin) |

---

## 🏗️ Architecture

```
developer-portfolio-builder/
├── app/                        # Expo Router routes (file-based navigation)
│   ├── (tabs)/                 # Bottom tab navigator: Dashboard, Manage, Notes, Toolbox, Settings
│   ├── (auth)/                 # Reserved for future auth flows (app requires none today)
│   ├── _layout.tsx             # Root layout: DB init, theming, splash screen
│   └── index.tsx               # Entry redirect (onboarding vs dashboard)
├── src/
│   ├── assets/                 # Fonts, icons, images
│   ├── components/
│   │   ├── common/              # AppCard, Badge, EmptyState, Skeleton, SectionHeader
│   │   ├── forms/                # RHF-wired inputs: text, select, tags, date, images, links, skill picker
│   │   ├── layouts/              # Screen wrapper (safe-area, scroll, refresh)
│   │   └── ui/                   # Reserved for future primitives
│   ├── constants/                # Route path registry
│   ├── features/                 # One folder per module (see table above), each with screens/ + components/
│   ├── hooks/                    # useTheme and other cross-cutting hooks
│   ├── lib/
│   │   ├── db/                    # SQLite schema + generic repository factory + per-entity repositories
│   │   ├── storage/                # AsyncStorage preferences wrapper
│   │   ├── pdf/                     # Resume HTML template + PDF generation (expo-print)
│   │   ├── export/                  # Portfolio site template + backup/restore service
│   │   └── validators/               # Zod schemas per entity
│   ├── navigation/                # (routing lives in Expo Router's app/ folder)
│   ├── store/                      # Zustand: generic entity-store factory + concrete stores
│   ├── theme/                      # MD3 palettes (7 presets), design tokens, ThemeProvider
│   ├── types/                      # Global domain models (single source of truth)
│   └── utils/                      # id generation, date helpers
├── tests/                        # Jest unit tests (utils + validators)
├── app.json                      # Expo config
├── package.json
└── tsconfig.json                 # Path aliases: @, @components, @features, @lib, @store, @theme, @types, @utils, @hooks, @constants, @navigation
```

### Design principles

- **Clean Architecture, feature-based.** Every module owns its `screens/` and `components/`; shared
  primitives live in `src/components`. Data access is layered: **SQLite repository → Zustand store →
  screen**. No screen talks to SQLite directly.
- **One generic repository factory** (`src/lib/db/repositories/createRepository.ts`) handles JSON/boolean
  column (de)serialization and CRUD for every entity, so each concrete repository is ~10 lines.
- **One generic store factory** (`src/store/createEntityStore.ts`) wraps any repository in a consistent
  `{ items, loading, error, load, add, edit, remove }` Zustand store.
- **Offline-first, always.** SQLite (via `expo-sqlite`) is the source of truth; AsyncStorage only holds
  small UI preferences (theme, onboarding flag). Nothing ever touches the network.
- **Strict typing.** Every entity is defined once in `src/types/models.ts` and validated at the form
  boundary with Zod schemas in `src/lib/validators`.

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- Expo CLI (`npx expo` — no global install needed)
- Android Studio (for an emulator) or a physical device with the **Expo Go** app, or an Android device
  with USB debugging enabled for a dev build

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Start the Metro bundler
npx expo start

# 3. Run on Android
npx expo start --android
# or press "a" in the terminal UI once Metro is running

# iOS / Web also work out of the box
npx expo start --ios
npx expo start --web
```

### Building a standalone Android APK/AAB

This project uses **EAS Build** (Expo's cloud/local build service):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # APK for sideloading/testing
eas build --platform android --profile production # AAB for Play Store
```

No `EAS_PROJECT_ID` or backend is required for the app itself — EAS is only used to *compile* the native
binary; the running app never talks to any server.

### Running tests

```bash
npm test
```

### Type-checking & linting

```bash
npm run typecheck
npm run lint
```

---

## 🔐 Privacy

All data — profile, skills, projects, notes, everything — is stored **locally on-device** in SQLite.
There is no backend, no account system, and no analytics SDK. The **Backup & Restore** module lets you
export a complete JSON snapshot whenever you want a portable copy or need to move to a new device.

---

## 🎨 Theming

Switch between **System / Light / Dark** mode, and choose from **7 visual presets** (Default, GitHub,
Dracula, Nord, Tokyo Night, One Dark, Catppuccin) — all built on Material Design 3 color roles so every
component automatically adapts. See `src/theme/palettes.ts` to add your own preset: define a `light` and
`dark` `AppColorScheme` and register it in `PALETTES`.

---

## 🧩 Extending the app

Adding a new "manager" module (e.g. a hypothetical "Conference Talks" tracker) takes four steps thanks to
the generic factories:

1. **Model** — add the entity shape to `src/types/models.ts`.
2. **Repository** — add a table to `src/lib/db/database.ts` and a 10-line repository via
   `createRepository()`.
3. **Store** — one line: `createEntityStore<YourEntity>(yourRepository)`.
4. **Screens** — a list screen + form screen following any existing module (Skills is the simplest
   reference implementation), plus a thin route file under `app/`.

---

## 📄 License

This project is provided as a portfolio/reference implementation. Use it, fork it, and make it your own.

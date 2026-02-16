## hifzul

An applicant project for the [Quran.Foundation Full-Stack Engineer role](https://quran.foundation/careers/full-stack-engineer) that highlights sustainable engineering, creative UX, and thorough documentation. Iteration 1 focuses on an **Interactive Memorization & Recitation Coach**, with deliberate hooks for a deep-study companion and narrative journey modes.

### Features (Iteration 1 scope)
- OAuth2-authenticated access to Quran.Foundation Content APIs with typed data helpers.
- Guided listen → whisper → recite → review loop, optimized for memorization drills.
- Audio tooling (looping, playback speed, metronome cues) and reflective prompts seeded from translations/tafsir.
- Lightweight telemetry on bundle size and API usage to reinforce sustainability goals.

### Project Structure
- `app/` – App Router routes, layouts, and page-level UX.
- `components/` – Reusable UI + headless logic for coach, pickers, feedback, and prompts.
- `lib/` – Config, API client, domain types, caching utilities, and browser storage helpers.
- `docs/` – Product vision, architecture metrics, and assessment report artifacts.
- `tests/` – Unit/integration tests (Vitest + React Testing Library) and Playwright e2e flows.

### Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment**
   - Duplicate `.env.example` to `.env.local`.
   - Fill in `QF_CLIENT_ID` and `QF_CLIENT_SECRET` from the [API Quick Start guide](https://api-docs.quran.foundation/docs/quickstart/).
3. **Run in development**
```bash
npm run dev
   ```
4. **Lint & test**
   ```bash
   npm run lint
   npm run test          # (once tests are added in later iterations)
   npm run test:e2e      # Playwright smoke suites
   ```

### Sustainability & Tooling Notes
- Strict ESLint config (no `any`, hooks rules, import ordering) plus Prettier formatting.
- SWR-based data hooks with caching + request deduplication to minimize API load.
- Bundle analyzer script for periodic review of client payloads.

### Roadmap
- **Now**: deliver the Interactive Memorization Coach end-to-end.
- **Next**: integrate tafsir/translation overlays for a Deep Study Companion.
- **Later**: craft the Narrative Journey UX with thematic progress arcs.

For more context, see `docs/product/vision.md` and the forthcoming assessment report after implementation.



## Sustainability & Observability Metrics


| Category          | What we track                                                                 | Why it matters                                                                |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Bundle Footprint  | `analyze:client` script (next-bundle-analyzer) snapshot before each milestone | Keep client payload under 180 KB for low-bandwidth regions                    |
| API Efficiency    | SWR cache hit/miss ratio, number of token exchanges per session               | Reduce duplicated Quran.Foundation requests and auth churn                    |
| Audio Runtime     | Average playback duration per verse, loop counts                              | Ensure our processing stays under browser autoplay limits and battery budgets |
| Session Longevity | Client-side session history size + sync frequency                             | Balance insight capture with storage constraints                              |


### Tooling

- `scripts/analyze.ts` (planned) will wrap `next build` with bundle analyzer.
- `lib/metrics/clientLogger.ts` (planned) emits structured events (performance + sustainability) for future aggregation.


### Next Steps

1. Implement metrics scaffolding alongside the memorization coach UI.
2. Export summarized metrics into `docs/product/assessment-report.md` for the application package.


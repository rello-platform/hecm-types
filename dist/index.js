"use strict";
/**
 * @rello-platform/hecm-types
 *
 * Canonical HECM (Home Equity Conversion Mortgage / reverse-mortgage) compute
 * contract for the Rello platform — the single source of truth for the input
 * Milo's deterministic engine consumes and the recommendation it returns.
 *
 * ── Ownership (APP-OWNERSHIP-MATRIX, HECM lock 2026-05-27) ──
 *   - Property Engine (PE) owns the HUD reference data (PLF tables, constants).
 *   - **Milo owns the HECM MATH** — `computeHecmRecommendation` is the canonical
 *     producer of the shapes below. This package codifies *Milo's* contract.
 *   - PFP owns the per-MLO reverse rate-sheet (it threads the v2 inputs).
 *
 * Before this package, three repos hand-mirrored these types
 * (Milo `src/lib/hecm/recommendation.ts`, Rello `src/lib/signals/hecm-eligibility.ts`,
 * PFP `src/lib/hecm/types.ts`). Drift on these shapes is drift on borrower-facing
 * reverse-mortgage dollar math — the highest-stakes silent-NaN surface on the
 * platform. Importing this package makes a HECM contract change a **compile
 * error** in every consumer instead of a silent divergence (CLAUDE.md Rule E).
 *
 * Pure types only — no runtime emit. Every export is `type`/`interface`, so the
 * package erases at every consumer's compile (no `require()` at runtime → no
 * CJS/ESM boundary hazard; Milo's CommonJS build never resolves it).
 *
 * ── v1 vs v2 ──
 *   v1 = the intent-only envelope (the 12 core fields on `HecmRecommendationCore`).
 *   v2 = additive proceeds/distribution/cost/projection/LESA/HomeSafe blocks.
 *   Milo's compute now ALWAYS returns the full v2 envelope (a v1-only caller
 *   receives the v1 fields verbatim PLUS the additive blocks populated from
 *   defaults), so the v2 blocks on `HecmRecommendation` are REQUIRED. Consumers
 *   that only read the v1 subset (Rello's M2B purchased-lead path) should type
 *   their read/persist shape as `HecmRecommendationCore`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=index.js.map
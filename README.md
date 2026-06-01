# @rello-platform/hecm-types

Canonical **HECM** (Home Equity Conversion Mortgage / reverse-mortgage) compute contract for the Rello platform: the typed input Milo's deterministic engine consumes (`HecmInput`) and the recommendation it returns (`HecmRecommendation`), plus the HTTP envelope (`HecmRecommendResponse`).

A single source of truth for the highest-stakes math surface on the platform — borrower-facing reverse-mortgage dollar figures. Before this package, **three repos hand-mirrored these shapes** (Milo `src/lib/hecm/recommendation.ts`, Rello `src/lib/signals/hecm-eligibility.ts`, PFP `src/lib/hecm/types.ts`). Consuming this package makes a HECM contract change a **compile error** in every consumer instead of a silent divergence / NaN (CLAUDE.md Rule E).

## Install

```bash
npm install "github:rello-platform/hecm-types#v0.2.0"
```

For Railway nixpacks: the repo is **public** and `dist/` is committed, so unauthenticated tag-pinned `npm install` works without an ssh client. No `prepare`/`postinstall` lifecycle script.

## Ownership (APP-OWNERSHIP-MATRIX, HECM lock 2026-05-27)

| Surface | Owner |
|---|---|
| HUD reference data (PLF tables, constants) | Property Engine (PE) |
| **HECM math** (`computeHecmRecommendation`) | **Milo** — canonical producer of these shapes |
| Per-MLO reverse rate-sheet (threads v2 inputs) | PathfinderPro (PFP) |

This package codifies **Milo's** contract. Milo re-exports these types from its `recommendation.ts`; Rello and PFP import them.

## Pure types — no runtime emit

Every export is a `type`/`interface`. The package erases at every consumer's compile, so nothing `require()`s it at runtime — there is no CJS/ESM boundary hazard (Milo's CommonJS build never resolves it). The committed `dist/index.js` is an empty CommonJS module; `dist/index.d.ts` carries the contract.

## v1 vs v2

- **v1** = the intent-only envelope: the 12 core fields on `HecmRecommendationCore`. This is the exact subset Rello's M2B purchased-lead path reads + persists (as an opaque `Lead.customFields.hecm_eligibility` jsonb blob).
- **v2** = additive proceeds / distribution / cost-itemization / projection / LESA / HomeSafe blocks.

Milo's compute now **always** returns the full v2 envelope (a v1-only caller receives the v1 fields verbatim PLUS the additive blocks populated from defaults), so the v2 blocks on `HecmRecommendation` are **required**. A consumer that only reads the v1 subset should type its read/persist shape as `HecmRecommendationCore`; a consumer that renders the v2 blocks uses `HecmRecommendation`.

## Exports

| Type | What it is |
|---|---|
| `HecmInput` | Engine input — v1 fields + optional/nullable v2 additive fields |
| `HecmRecommendationCore` | v1 core (12 fields) — the Rello read/persist subset |
| `HecmRecommendation` | Full envelope = core + required v2 blocks (Milo's return shape) |
| `HecmRecommendResponse` | Milo `/api/hecm/recommend` HTTP envelope (`{ success, data, error? }`) |
| `HecmDistributionType` | Payment-plan union (`LUMP_SUM` … `MODIFIED`) |
| `HecmSheetPremiumBand` | One PLU band forwarded from the PFP reverse rate-sheet |
| `HecmDistribution` `HecmCosts` `HecmFirstYear` `HecmLesa` `HecmProjection` `HecmDerivedCoverage` `HecmHomesafeRouting` | The v2 output blocks |
| `HecmContentPublic` | Published HECM education-content row served by Rello's `GET /api/hecm/content` (v0.2.0) |
| `HecmContentType` | Content-category union — TS mirror of Rello's `HecmContentType` Prisma enum (v0.2.0) |

## Usage

```ts
import type {
  HecmInput,
  HecmRecommendation,
  HecmRecommendationCore,
  HecmRecommendResponse,
} from '@rello-platform/hecm-types';
```

Every figure these types carry is **illustrative** — never a quote, pre-qualification, or offer (SPEC §4.4 / Platform Rule L8).

## HECM education content (v0.2.0)

`HecmContentPublic` / `HecmContentType` are a **separate surface** from the compute contract: the read shape of the HECM education content authored + published in **Rello** Platform Admin (the `HecmContent` model / `HecmContentType` enum) and served by `GET /api/hecm/content`. **Rello owns** authoring (its definition is canonical, codified here); **PFP consumes** it — the HECM-advisor workspace pulls the ACTIVE set dynamically and renders it. Before v0.2.0, PFP re-declared this shape locally — a Rule-E silent-drift risk this fold retires.

`contentType` stays `string` on `HecmContentPublic` (a new admin-authored category never breaks the read path); use the `HecmContentType` union when narrowing the known categories.

## Migration note

This package's PUBLISH pipeline (git tag = publish) is throwaway at the platform monorepo migration (PLATFORM-MONOREPO-EVALUATION Q8) — at that point the types move cleanly to `packages/hecm-types/` as a workspace path-import. The types themselves survive unchanged.

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

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Distribution options a HECM borrower can model (HUD §255 payment plans). */
export type HecmDistributionType =
  | 'LUMP_SUM'
  | 'LOC'
  | 'GROWING_LOC'
  | 'TENURE'
  | 'TERM'
  | 'MODIFIED';

/**
 * One rate-sheet PLU (principal-limit-utilization) band forwarded from the PFP
 * reverse cockpit-rate sheet (`HecmInput.sheetPremiumByPlu`). Structurally
 * identical to PFP's `ReversePremiumBand` (rate-sheet ingestion type) — the
 * engine never re-derives the storage shape, it consumes the resolved bands the
 * proxy threads through.
 */
export interface HecmSheetPremiumBand {
  /** PLU band lower bound (inclusive), in %. */
  pluBandMin: number;
  /** PLU band upper bound (inclusive), in %. */
  pluBandMax: number;
  /** Per-margin price across this band; `price` in points (100 = par). */
  prices: Array<{ margin: number; price: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The typed input `computeHecmRecommendation` consumes. Mapped from
 * `Lead.customFields` by the Rello caller (M2B) / threaded by the PFP HECM
 * workspace proxy (v2). Every v2 field is OPTIONAL + nullable — absent → the
 * engine falls back to a named constant / PE constant / cockpit-policy and never
 * throws. Adding the v2 fields is additive-backward-compatible (Platform Rule L):
 * a v1 caller sending only the v1 fields is byte-identical on every preserved
 * output field.
 *
 * v1 field provenance (the DISCOVERED input contract — `hh_*` Harvest-Home keys):
 *   ownerOccupied    ← cf.hh_owner_occupied      (true | "Y")
 *   intentType       ← cf.hh_intent_type
 *   estimatedValue   ← cf.hh_estimated_value
 *   lien1Balance     ← cf.hh_lien1_est_balance
 *   lien2Balance     ← cf.hh_lien2_est_balance   (optional; only with a 2nd lien)
 *   equityCrosscheck ← cf.hh_equity              (cross-check only; derive is primary)
 */
export interface HecmInput {
  ownerOccupied: boolean | string | null;
  intentType: string | null;
  estimatedValue: number | null;
  lien1Balance: number | null;
  lien2Balance: number | null;
  equityCrosscheck?: number | null;
  /** Explicit youngest-borrower age from the PFP HECM workspace; absent for the
   *  M2B purchased-lead path → engine uses the intent-gated 62 floor. */
  borrowerAge?: number | null;
  /** MLO's real offered HECM expected rate (percent) from the PFP reverse
   *  rate-sheet; absent → the engine's HECM_EXPECTED_RATE fallback (M2B path). */
  expectedRate?: number | null;

  // ── v2 ADDITIVE (all optional/nullable; absent → engine falls back) ──

  /** L4 — borrower's modeled draw percentage of principal limit (0..100). */
  targetPlu?: number | null;
  /** L1 — selected distribution option. */
  distributionType?: HecmDistributionType | null;
  /** L1 — desired monthly draw (TERM/MODIFIED). */
  targetMonthlyPayment?: number | null;
  /** L1 — term years for TERM/MODIFIED (engine clamps [1..30]). */
  termYears?: number | null;
  /** L2 — borrower's monthly income for FA / residual-income check. */
  borrowerIncome?: number | null;
  /** L2 — household family size for residual-income lookup (engine clamps [1..4]). */
  familySize?: number | null;
  /** L2/L3 — projected annual property charges (taxes + insurance + HOA). */
  propertyChargesEstimate?: number | null;
  /** L3 — caller-supplied third-party closing-costs estimate (escrow/title/
   *  appraisal/recording — NOT origination, NOT upfront MIP). */
  thirdPartyClosingCostsEstimate?: number | null;
  /** L9 — projection horizon override (engine clamps [1..30]). */
  projectionHorizonYears?: number | null;
  /** L2/L7 — 2-letter state for residual-income region resolution. */
  state?: string | null;
  /** L4 / §3.3 — sheet-resolved premium-by-PLU bands (drives derivedCoverage). */
  sheetPremiumByPlu?: HecmSheetPremiumBand[] | null;
  /** L4 / §3.3 — borrower's selected margin (sheet-resolved). */
  sheetMargin?: number | null;
  /** §6 cockpit-policy bundle (cascade-resolved illustrative-discovery
   *  assumptions). Absent → named fallbacks. */
  hecmAssumptions?: {
    thirdPartyClosingCostsDefault?: number | null;
    projectionHorizonYears?: number | null;
    servicingFeeAssumption?: number | null;
    propertyChargesFallback?: number | null;
    lesaResidualIncomeShortfallThreshold?: number | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// v2 additive output blocks
// ─────────────────────────────────────────────────────────────────────────────

/** L1 — distribution-mode block. Every mode is populated for the L6 compare;
 *  `selected` echoes the caller's `distributionType` (null when none chosen). */
export interface HecmDistribution {
  selected: HecmDistributionType | null;
  lumpSum: { amount: number } | null;
  loc: { initialAvailable: number; growthRateMonthly: number } | null;
  growingLoc: {
    initialAvailable: number;
    growthRateMonthly: number;
    trajectory: Array<{ year: number; available: number }>;
  };
  tenure: { monthlyPayment: number; annuityFactor: number } | null;
  term: { monthlyPayment: number; annuityFactor: number; termYears: number } | null;
  modified: { upfrontDraw: number; monthlyPayment: number; remainingLocInitial: number } | null;
}

/** L3 — itemized closing costs (every line $-denominated; all illustrative). */
export interface HecmCosts {
  upfrontMip: number;
  originationFee: number;
  originationFeeSource: 'HUD_LADDER' | 'FIXED_SHEET_LADDER';
  servicingSetAside: number;
  lesa: number;
  thirdPartyClosingCosts: number;
  lienPayoff: number;
  /** upfrontMip + origination + servicing + lesa + thirdParty (NOT lienPayoff). */
  totalFinanced: number;
  /** totalFinanced + lienPayoff (the headline deduction from PL). */
  totalDeducted: number;
}

/** L5 — year-1 / year-2 disbursement breakdown (ML 2014-11 60% year-1 cap). */
export interface HecmFirstYear {
  yearOneCapPct: number;
  mandatoryObligations: number;
  yearOneAvailable: number;
  yearTwoUnlock: number;
}

/** L2 — LESA (Life Expectancy Set-Aside) compute, or a skip with a reason. */
export interface HecmLesa {
  kind: 'NOT_RUN' | 'NOT_REQUIRED' | 'PARTIALLY_FUNDED' | 'FULLY_FUNDED';
  reason:
    | 'income_not_provided'
    | 'family_size_not_provided'
    | 'charges_not_provided'
    | 'fa_passed'
    | null;
  amount: number;
  projectedAnnualPropertyCharges: number | null;
  residualIncomeRequired: number | null;
  residualIncomeShortfall: number | null;
  leFactor: number | null;
}

/** L9 — deterministic over-time projection (NO home-value appreciation). */
export interface HecmProjection {
  horizonYears: number;
  yearMarkers: number[];
  balanceTrajectory: Array<{
    year: number;
    balance: number;
    cumulativeInterest: number;
    cumulativeOngoingMip: number;
  }>;
  growingLocTrajectory: Array<{ year: number; available: number }>;
  tenureStream: {
    monthlyPayment: number;
    cumulativePayments12mo: number;
    cumulativeAtHorizon: number;
  } | null;
  termStream: {
    monthlyPayment: number;
    termYears: number;
    cumulativeAtHorizon: number;
  } | null;
  /** Flat = input.estimatedValue (NEVER a forecast). */
  homeValueReference: number;
  nonRecourseAssertion: true;
}

/** L4 — derived closing-cost coverage (the ONLY premium-touching $-surface). */
export interface HecmDerivedCoverage {
  coverageDollars: number | null;
  /** Engine-side audit only — NEVER rendered (spec §7.2). */
  pricePoints: number | null;
  source: 'sheet' | 'unavailable';
}

/**
 * L7 — HomeSafe routing gate (no compute; a pure routing flag). The engine owns
 * the `above_mca` gate ONLY (it holds the MCA constant). The `under_62`
 * surfacing is NOT an engine concern: GATE 2A nulls an under-62 lead, so there
 * is no engine envelope to carry an under_62 signal — a consumer that wants an
 * under-62 HomeSafe callout must derive it from the borrower age + its own
 * HomeSafe-product matrix when `rec === null`, NOT from this field.
 */
export interface HecmHomesafeRouting {
  shouldSurface: boolean;
  reason: 'above_mca' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation envelope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The v1 core of a HECM recommendation — the intent-only envelope. This is the
 * exact subset the Rello M2B purchased-lead path reads and persists (as an
 * opaque `Lead.customFields.hecm_eligibility` jsonb blob). Consumers that never
 * read the v2 blocks should type their read shape as `HecmRecommendationCore`.
 */
export interface HecmRecommendationCore {
  signalBasis: 'reverse_mortgage_intent';
  ownerOccupiedConfirmed: true;
  /** PLF age basis: the 62 floor (no explicit age / intent-gated path) or the
   *  explicit youngest-borrower age supplied by the PFP HECM workspace. */
  ageBasis: 'intent_gated_62_floor' | 'explicit_borrower_age';
  /** Derived: value − liens. */
  equity: number;
  maxClaimAmount: number;
  principalLimit: number;
  /** Existing mortgage/HELOC balance the HECM retires (lien1 + lien2); 0 if none.
   *  Already netted out of `estNetAvailable`. */
  liensPaidOff: number;
  /** Headline net available — L3-itemized: principalLimit − (upfrontMip +
   *  origination + servicing + lesa + thirdPartyClosing + lienPayoff). Always
   *  > 0 when a rec is returned (GATE 4 nulls the rec when ≤ 0). */
  estNetAvailable: number;
  /** The rate actually used for the PLF lookup (HUD-grid-snapped); the MLO's
   *  offered rate when supplied, else the engine's HECM_EXPECTED_RATE fallback. */
  expectedRate: number;
  /** 'sheet' = the MLO's real offered rate from the PFP reverse rate-sheet;
   *  'default' = the HECM_EXPECTED_RATE fallback. */
  expectedRateBasis: 'sheet' | 'default';
  sourceMortgageeLetter: string;
  /** NEVER a quote/offer (SPEC §4.4 / L8) — covers the v2 blocks by inheritance. */
  illustrative: true;
}

/**
 * The full HECM recommendation Milo's `computeHecmRecommendation` returns: the
 * v1 core PLUS the v2 additive blocks (always present — see header). Every v2
 * block is illustrative by inheritance from `illustrative: true`.
 */
export interface HecmRecommendation extends HecmRecommendationCore {
  distribution: HecmDistribution;
  costs: HecmCosts;
  firstYear: HecmFirstYear;
  lesa: HecmLesa;
  projection: HecmProjection;
  /** null when the proxy didn't pass premiumByPlu + margin + targetPlu (sheet
   *  absent or expectedRate-only path). */
  derivedCoverage: HecmDerivedCoverage | null;
  homesafeRouting: HecmHomesafeRouting;
}

/**
 * Milo `/api/hecm/recommend` HTTP envelope. `data === null` on a 200 is a
 * SUCCESS — "computed, not a candidate" (gates failed) — NOT an error; consumers
 * distinguish by `data === null`. On a 4xx/5xx, `success` is false and `error`
 * carries the reason.
 */
export interface HecmRecommendResponse {
  success: boolean;
  data: HecmRecommendation | null;
  error?: string;
}

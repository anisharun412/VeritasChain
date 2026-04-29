pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/bitify.circom";

/// @title FreshnessModel
/// @notice Kinetic spoilage model circuit for VeritasChain.
///
///         Implements a simplified Arrhenius-based kinetic spoilage calculation:
///           penalty = elapsedHours * baseDecayRate
///                   + tempIntegral * excursionWeight
///                   + excursionCount * excursionPenalty
///           newScore = max(0, previousScore - penalty)
///
///         All inputs are scaled integers (no floating point).
///         Input scaling factor: 1e3 (i.e. a rate of 1.5 → 1500).
///         Products of two 1e3-scaled values become 1e6-scaled.
///         Final division by 1e6 yields the penalty in score points.
///
///         Public inputs (verified on-chain):
///           - previousScore   : current score (0-100)
///           - newScore        : updated score after penalty (0-100)
///
///         Private inputs (not revealed on-chain):
///           - elapsedHours    : hours since last score update
///           - tempIntegral    : integral of |temp - setpoint| over elapsed time
///                               (scaled by 1e3, units: °C·h·1e3)
///           - excursionCount  : number of temperature excursions detected
///           - baseDecayRate   : decay per hour at nominal temp (scaled 1e3)
///           - excursionWeight : penalty weight per unit of tempIntegral (scaled 1e3)
///           - excursionPenalty: flat penalty per excursion event (scaled 1e3)

template FreshnessModel() {
    // ── Public signals ───────────────────────────────────────────────────────
    signal input  previousScore;   // 0-100
    signal output newScore;        // 0-100

    // ── Private signals ──────────────────────────────────────────────────────
    signal input elapsedHours;     // >= 0
    signal input tempIntegral;     // >= 0, scaled 1e3
    signal input excursionCount;   // >= 0
    signal input baseDecayRate;    // scaled 1e3 (e.g. 2000 = 2.0 pts/hr)
    signal input excursionWeight;  // scaled 1e3
    signal input excursionPenalty; // scaled 1e3 per excursion

    // ── Intermediate signals ─────────────────────────────────────────────────
    signal timePenalty;
    signal excursionIntPenalty;
    signal flatPenalty;
    signal totalPenaltyScaled;
    signal totalPenalty;         // unscaled (divided by 1e3)
    signal remainder;
    signal scoreBeforeClamp;

    // ── Calculations ─────────────────────────────────────────────────────────

    signal scaledElapsedHours;
    signal scaledExcursionCount;
    scaledElapsedHours <== elapsedHours * 1000;
    scaledExcursionCount <== excursionCount * 1000;

    // timePenalty (scaled 1e6) = scaledElapsedHours * baseDecayRate
    timePenalty <== scaledElapsedHours * baseDecayRate;

    // excursionIntPenalty (scaled 1e6) = tempIntegral * excursionWeight
    excursionIntPenalty <== tempIntegral * excursionWeight;

    // flatPenalty (scaled 1e6) = scaledExcursionCount * excursionPenalty
    flatPenalty <== scaledExcursionCount * excursionPenalty;

    // totalPenaltyScaled (scaled 1e6)
    totalPenaltyScaled <== timePenalty + excursionIntPenalty + flatPenalty;

    // Divide by 1e6 to get penalty in score points.
    totalPenalty <-- totalPenaltyScaled \ 1000000;
    remainder <-- totalPenaltyScaled % 1000000;

    // Enforce: totalPenaltyScaled = totalPenalty * 1e6 + remainder
    // with 0 <= remainder < 1e6 (integer division).
    totalPenaltyScaled === totalPenalty * 1000000 + remainder;

    component remBits = Num2Bits(20);
    remBits.in <== remainder;

    component remRange = LessThan(20); // 2^20 = 1,048,576
    remRange.in[0] <== remainder;
    remRange.in[1] <== 1000000;
    remRange.out === 1;

    // scoreBeforeClamp = previousScore - totalPenalty
    scoreBeforeClamp <== previousScore - totalPenalty;

    // ── Clamp to 0 using a comparator ────────────────────────────────────────
    // isNeg = 1 if scoreBeforeClamp < 0
    // We approximate: if penalty >= previousScore → newScore = 0
    component isGe = GreaterEqThan(32);
    isGe.in[0] <== totalPenalty;
    isGe.in[1] <== previousScore;

    // Mux: if isGe.out == 1 → newScore = 0, else → newScore = scoreBeforeClamp
    component mux = Mux1();
    mux.c[0] <== scoreBeforeClamp;
    mux.c[1] <== 0;
    mux.s    <== isGe.out;

    newScore <== mux.out;

    // ── Range constraints ────────────────────────────────────────────────────
    // Ensure previousScore and newScore are in [0, 100]
    component prevInRange = LessThan(7);
    prevInRange.in[0] <== previousScore;
    prevInRange.in[1] <== 101;
    prevInRange.out === 1;

    component newInRange = LessThan(7);
    newInRange.in[0] <== newScore;
    newInRange.in[1] <== 101;
    newInRange.out === 1;

    // ── Input range constraints ────────────────────────────────────────────
    component elapsedBits = Num2Bits(32);
    elapsedBits.in <== elapsedHours;

    component tempIntegralBits = Num2Bits(32);
    tempIntegralBits.in <== tempIntegral;

    component excursionCountBits = Num2Bits(32);
    excursionCountBits.in <== excursionCount;

    component baseDecayRateBits = Num2Bits(32);
    baseDecayRateBits.in <== baseDecayRate;

    component excursionWeightBits = Num2Bits(32);
    excursionWeightBits.in <== excursionWeight;

    component excursionPenaltyBits = Num2Bits(32);
    excursionPenaltyBits.in <== excursionPenalty;

    component totalPenaltyBits = Num2Bits(32);
    totalPenaltyBits.in <== totalPenalty;
}

component main { public [previousScore] } = FreshnessModel();

pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/iszero.circom";

/// @title TempRange
/// @notice Zero-knowledge temperature compliance circuit for VeritasChain.
///
///         Proves that every temperature reading in a leg was within the
///         cold-chain specification range [min, max] WITHOUT revealing
///         the individual readings to verifiers.
///
///         Supports up to MAX_READINGS readings per proof.
///         If fewer readings are available, pad with a valid in-range value.
///
///         Public inputs:
///           - min          : Lower bound (°C × 10 to avoid decimals, e.g. -25 = -250)
///           - max          : Upper bound (°C × 10, e.g. 8 = 80)
///           - readingCount : Number of real readings (1 - MAX_READINGS)
///         Private inputs:
///           - readings[MAX_READINGS] : Temperature values (°C × 10)
///         Output:
///           - ok           : 1 if all readings[0..readingCount-1] are in [min, max]

template TempRange(MAX_READINGS) {
    // ── Public signals ───────────────────────────────────────────────────────
    signal input  min;                            // lower bound (scaled ×10)
    signal input  max;                            // upper bound (scaled ×10)
    signal input  readingCount;                   // how many readings are real
    signal output ok;                             // 1 = all in range

    // ── Private signals ──────────────────────────────────────────────────────
    signal input readings[MAX_READINGS];

    // ── Per-reading range check ───────────────────────────────────────────────
    // For each reading r: prove  min <= r  AND  r <= max
    // We offset all values by +512 to compare as unsigned 10-bit integers.
    // Readings at index >= readingCount are masked out (auto-pass).

    var TEMP_OFFSET = 512;
    signal minShifted;
    signal maxShifted;
    minShifted <== min + TEMP_OFFSET;
    maxShifted <== max + TEMP_OFFSET;

    component minBits = Num2Bits(10);
    minBits.in <== minShifted;

    component maxBits = Num2Bits(10);
    maxBits.in <== maxShifted;

    component maxGeMin = GreaterEqThan(10);
    maxGeMin.in[0] <== maxShifted;
    maxGeMin.in[1] <== minShifted;
    maxGeMin.out === 1;

    component readingCountBits = Num2Bits(6);
    readingCountBits.in <== readingCount;

    component readingCountLimit = LessThan(6);
    readingCountLimit.in[0] <== readingCount;
    readingCountLimit.in[1] <== MAX_READINGS + 1;
    readingCountLimit.out === 1;

    component readingCountNonZero = IsZero();
    readingCountNonZero.in <== readingCount;
    readingCountNonZero.out === 0;

    component geMin[MAX_READINGS];
    component leMax[MAX_READINGS];
    component isActive[MAX_READINGS];
    signal readingShifted[MAX_READINGS];
    component readingBits[MAX_READINGS];

    signal allOk[MAX_READINGS + 1];
    allOk[0] <== 1;

    for (var i = 0; i < MAX_READINGS; i++) {
        // isActive[i].out = 1 if i < readingCount (reading is real)
        isActive[i] = LessThan(6);   // 6 bits covers indices 0..63
        isActive[i].in[0] <== i;
        isActive[i].in[1] <== readingCount;

        readingShifted[i] <== readings[i] + TEMP_OFFSET;
        readingBits[i] = Num2Bits(10);
        readingBits[i].in <== readingShifted[i];

        // geMin[i].out = 1 if readings[i] >= min
        geMin[i] = GreaterEqThan(10);
        geMin[i].in[0] <== readingShifted[i];
        geMin[i].in[1] <== minShifted;

        // leMax[i].out = 1 if readings[i] <= max  (i.e. max >= readings[i])
        leMax[i] = GreaterEqThan(10);
        leMax[i].in[0] <== maxShifted;
        leMax[i].in[1] <== readingShifted[i];

        // inRange = geMin AND leMax
        signal inRange;
        inRange <== geMin[i].out * leMax[i].out;

        // result = isActive ? inRange : 1  (inactive readings auto-pass)
        // result = isActive * inRange + (1 - isActive) * 1
        //        = isActive * inRange + 1 - isActive
        //        = 1 - isActive * (1 - inRange)
        signal readingResult;
        readingResult <== 1 - isActive[i].out * (1 - inRange);

        // Accumulate
        allOk[i + 1] <== allOk[i] * readingResult;
    }

    ok <== allOk[MAX_READINGS];
}

// Instantiate for up to 48 readings per proof (≈ 1 per 30 minutes over 24 h)
component main { public [min, max, readingCount] } = TempRange(48);

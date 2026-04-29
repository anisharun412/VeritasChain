pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

/// @title DocMatch
/// @notice Zero-knowledge document hash matching circuit for VeritasChain.
///
///         Proves that a private document hash matches the hash committed
///         on-chain (via PostHashAnchors / InteroperabilityAnchor) WITHOUT
///         revealing the raw document bytes.
///
///         Public inputs:
///           - anchorHash : The SPHINCS+-to-Poseidon bridge hash that was
///                          anchored on-chain. Computed as:
///                          Poseidon([sphincsPqHash_hi, sphincsPqHash_lo])
///                          where hi/lo split the 256-bit SPHINCS+ hash into
///                          two 128-bit field elements.
///         Private inputs:
///           - sphincsPqHash_hi : High 128 bits of the SPHINCS+ document hash.
///           - sphincsPqHash_lo : Low 128 bits of the SPHINCS+ document hash.
///
///         Output:
///           - match : 1 if hashes match, circuit would be unsatisfiable
///                     if they don't (enforced by the === constraint).

template DocMatch() {
    // ── Public signals ───────────────────────────────────────────────────────
    signal input  anchorHash;       // Poseidon hash stored on-chain

    // ── Private signals ──────────────────────────────────────────────────────
    signal input  sphincsPqHash_hi; // high 128 bits of SPHINCS+ doc hash
    signal input  sphincsPqHash_lo; // low  128 bits of SPHINCS+ doc hash

    // ── Output ───────────────────────────────────────────────────────────────
    signal output match;            // always 1 if proof is valid

    // ── Compute Poseidon hash of the two halves ───────────────────────────────
    component hasher = Poseidon(2);
    hasher.inputs[0] <== sphincsPqHash_hi;
    hasher.inputs[1] <== sphincsPqHash_lo;

    // ── Enforce match ────────────────────────────────────────────────────────
    anchorHash === hasher.out;

    // Output is trivially 1 when the proof is satisfiable
    match <== 1;
}

component main { public [anchorHash] } = DocMatch();

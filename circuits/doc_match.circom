// Placeholder circuit: enforces equality between hashes.
template DocMatch() {
  signal input docHash;
  signal input anchorHash;
  signal output match;

  docHash === anchorHash;
  match <== 1;
}

component main = DocMatch();

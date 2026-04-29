// Placeholder circuit: replace with a proven spoilage model.
template FreshnessModel() {
  signal input previousScore;
  signal input penalty;
  signal output newScore;

  newScore <== previousScore - penalty;
}

component main = FreshnessModel();

// Placeholder circuit for temperature range checks.
// For MVP, proof generation is mocked in the API layer.

template TemperatureRangeCheck(N) {
  signal input temperatures[N];
  signal input min;
  signal input max;
  signal output valid;
  signal output docHash;

  valid <== 1;
  docHash <== 0;
}

component main = TemperatureRangeCheck(288);

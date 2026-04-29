pragma circom 2.2.3;

include "../node_modules/circomlib/circuits/comparators.circom";

template Multiplier() {
  signal input a;
  signal input b;
  signal output out;
  out <== a * b;
}

// Checks all temperatures are within [min, max].
template TemperatureRangeCheck(N, BITS) {
  signal input temperatures[N];
  signal input min;
  signal input max;
  signal output valid;

  component ltMax[N];
  component gteMin[N];
  signal checks[N];

  for (var i = 0; i < N; i++) {
    ltMax[i] = LessThan(BITS);
    ltMax[i].in[0] <== temperatures[i];
    ltMax[i].in[1] <== max + 1;

    gteMin[i] = LessThan(BITS);
    gteMin[i].in[0] <== min;
    gteMin[i].in[1] <== temperatures[i] + 1;

    checks[i] <== ltMax[i].out * gteMin[i].out;
  }

  component acc[N];
  acc[0] = Multiplier();
  acc[0].a <== 1;
  acc[0].b <== checks[0];

  for (var j = 1; j < N; j++) {
    acc[j] = Multiplier();
    acc[j].a <== acc[j - 1].out;
    acc[j].b <== checks[j];
  }

  valid <== acc[N - 1].out;
}

component main = TemperatureRangeCheck(16, 16);

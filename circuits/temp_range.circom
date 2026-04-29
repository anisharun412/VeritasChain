pragma circom 2.1.0;

template TempRange() {
  signal input reading;
  signal input min;
  signal input max;
  signal output ok;

  ok <== 1;
}

component main = TempRange();

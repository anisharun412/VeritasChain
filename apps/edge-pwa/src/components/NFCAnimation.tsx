interface NFCAnimationProps {
  state: 'idle' | 'scanning' | 'success' | 'error';
  size?: number;
}

export default function NFCAnimation({ state, size = 80 }: NFCAnimationProps) {
  const circle = size;
  const ringPad = size * 0.45;

  const color =
    state === 'scanning' ? '#2563eb'
    : state === 'success' ? '#059669'
    : state === 'error'   ? '#dc2626'
    : '#94a3b8';

  const icon =
    state === 'success' ? '✓'
    : state === 'error'   ? '✗'
    : '📡';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: circle + ringPad * 2, height: circle + ringPad * 2 }}>
      {/* Pulse rings */}
      {state === 'scanning' && (
        <>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`vc-pulse-ring${i > 0 ? ` vc-pulse-ring-${i + 1}` : ''}`}
              style={{
                position: 'absolute',
                width: circle + (i + 1) * 20,
                height: circle + (i + 1) * 20,
                border: `2px solid ${color}`,
                borderRadius: '50%',
                opacity: 0,
              }}
            />
          ))}
        </>
      )}

      {/* Main circle */}
      <div style={{
        width: circle,
        height: circle,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        background: state === 'idle' ? '#f8fafc' : `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: circle * 0.4,
        transition: 'all .3s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        {state === 'scanning' ? (
          <span style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid', borderColor: `${color} transparent transparent transparent`, display: 'inline-block' }} className="vc-spin" />
        ) : icon}
      </div>
    </div>
  );
}

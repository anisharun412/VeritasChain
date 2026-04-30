import React from 'react';

type NFCState = 'idle' | 'scanning' | 'success' | 'failure' | 'timeout';

interface NFCAnimationProps {
  state: NFCState;
  icon?: string;
  label?: string;
  size?: number;
}

const STATE_CONFIG: Record<NFCState, { color: string; bg: string; borderColor: string; text: string }> = {
  idle:     { color: '#94a3b8', bg: '#f1f5f9', borderColor: '#cbd5e1', text: 'Tap to start scanning' },
  scanning: { color: '#10B981', bg: '#f0fdf4', borderColor: '#10B981', text: 'Hold phone against the seal...' },
  success:  { color: '#059669', bg: '#d1fae5', borderColor: '#059669', text: '✅ Read Successfully' },
  failure:  { color: '#EF4444', bg: '#fee2e2', borderColor: '#EF4444', text: '❌ Read Failed — Try again' },
  timeout:  { color: '#94a3b8', bg: '#f1f5f9', borderColor: '#cbd5e1', text: '⏰ Scan timeout — Tap to retry' },
};

export default function NFCAnimation({ state, icon = '📱', label, size = 160 }: NFCAnimationProps) {
  const cfg = STATE_CONFIG[state];

  // Haptic feedback on success
  React.useEffect(() => {
    if (state === 'success' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [state]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Main circle with ripple rings */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Ripple rings (only during scanning) */}
        {state === 'scanning' && (
          <>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${cfg.color}`,
              animation: 'nfc-ripple 1.5s ease-out infinite',
              opacity: 0,
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${cfg.color}`,
              animation: 'nfc-ripple 1.5s ease-out 0.5s infinite',
              opacity: 0,
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${cfg.color}`,
              animation: 'nfc-ripple 1.5s ease-out 1s infinite',
              opacity: 0,
            }} />
          </>
        )}

        {/* Main circle */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: cfg.bg,
          border: `3px ${state === 'idle' ? 'dashed' : 'solid'} ${cfg.borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4,
          transition: 'all 0.3s ease',
          animation: state === 'failure' ? 'nfc-shake 0.4s ease' : state === 'success' ? 'nfc-pop 0.3s ease' : 'none',
        }}>
          {state === 'success' ? (
            <span style={{ fontSize: size * 0.3, color: cfg.color }}>✓</span>
          ) : state === 'failure' ? (
            <span style={{ fontSize: size * 0.3, color: cfg.color }}>✕</span>
          ) : (
            <span style={{ fontSize: size * 0.25 }}>{icon}</span>
          )}
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: cfg.color,
        textAlign: 'center', maxWidth: 240,
      }}>
        {label || cfg.text}
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes nfc-ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes nfc-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @keyframes nfc-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

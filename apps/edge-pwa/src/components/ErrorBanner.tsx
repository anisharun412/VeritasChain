import { useState } from 'react';

interface ErrorBannerProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  onDismiss?: () => void;
}

const STYLES = {
  error:   { cls: 'vc-alert vc-alert-error',   icon: '⚠' },
  warning: { cls: 'vc-alert vc-alert-warning', icon: '⚠' },
  info:    { cls: 'vc-alert vc-alert-info',    icon: 'ℹ' },
  success: { cls: 'vc-alert vc-alert-success', icon: '✓' },
};

export default function ErrorBanner({ message, type = 'error', title, onDismiss }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { cls, icon } = STYLES[type];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={cls} style={{ marginBottom: 16 }}>
      <span style={{ fontSize: 16, flexShrink: 0, fontWeight: 700 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {title && <p style={{ fontWeight: 600, marginBottom: 2 }}>{title}</p>}
        <p style={{ fontSize: 14 }}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', opacity: .6, fontSize: 18, padding: 0, color: 'inherit', lineHeight: 1 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

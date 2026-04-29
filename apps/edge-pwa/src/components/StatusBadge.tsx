type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral';

interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  dot?: boolean;
}

const MAP: Record<StatusVariant, { cls: string; dot: string }> = {
  success: { cls: 'vc-chip vc-chip-green',  dot: '#059669' },
  warning: { cls: 'vc-chip vc-chip-amber',  dot: '#d97706' },
  error:   { cls: 'vc-chip vc-chip-red',    dot: '#dc2626' },
  info:    { cls: 'vc-chip vc-chip-blue',   dot: '#2563eb' },
  pending: { cls: 'vc-chip vc-chip-gray',   dot: '#94a3b8' },
  neutral: { cls: 'vc-chip vc-chip-gray',   dot: '#94a3b8' },
};

export default function StatusBadge({ status, label, dot = true }: StatusBadgeProps) {
  const { cls, dot: dotColor } = MAP[status];
  return (
    <span className={cls}>
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}

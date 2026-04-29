import React from 'react';

interface StatusIndicatorProps {
  status: 'pending' | 'ready' | 'in-transit' | 'completed' | 'contested';
}

const MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'status-indicator status-pending' },
  ready:      { label: 'Ready',      cls: 'status-indicator status-ready' },
  'in-transit':{ label: 'In Transit', cls: 'status-indicator status-in-transit' },
  completed:  { label: 'Completed',  cls: 'status-indicator status-completed' },
  contested:  { label: 'Contested',  cls: 'status-indicator status-contested' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { label, cls } = MAP[status] ?? MAP['pending'];
  return (
    <span className={cls}>
      <span className="status-dot" />
      {label}
    </span>
  );
};

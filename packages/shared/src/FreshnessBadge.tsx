import React from 'react';
import { FreshnessScoreDisplay } from '@veritaschain/types';

interface FreshnessBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({ score }) => {
  const getDisplay = (): FreshnessScoreDisplay => {
    if (score >= 80) return { score, level: 'excellent', color: 'green', icon: '✓' };
    if (score >= 50) return { score, level: 'good',      color: 'yellow', icon: '⚠' };
    return               { score, level: 'critical',     color: 'red',    icon: '✕' };
  };

  const display = getDisplay();
  const cls = display.color === 'green'
    ? 'freshness-badge freshness-green'
    : display.color === 'yellow'
    ? 'freshness-badge freshness-yellow'
    : 'freshness-badge freshness-red';

  return (
    <span className={cls}>
      <span>{display.icon}</span>
      <span>{display.score}%</span>
    </span>
  );
};

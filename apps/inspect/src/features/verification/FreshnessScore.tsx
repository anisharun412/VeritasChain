import React from 'react';

interface FreshnessScoreProps {
  score: number;
}

export const FreshnessScore: React.FC<FreshnessScoreProps> = ({ score }) => {
  const color = score >= 80 ? 'var(--emerald)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Acceptable' : 'Critical';
  const desc = score >= 80
    ? 'All temperature readings within optimal range.'
    : score >= 50
    ? 'Minor deviations detected. Review recommended.'
    : 'Significant temperature violations. Chain integrity at risk.';

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🌡 Freshness Score</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>0–100 scale</span>
      </div>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div
          className="score-ring"
          style={{ borderColor: color, color }}
        >
          <div className="score-num">{score}</div>
          <div className="score-label">/ 100</div>
        </div>
        <div>
          <div className="font-bold" style={{ color, fontSize: '1.1rem' }}>{label}</div>
          <div className="text-sm" style={{ color: 'var(--gray-600)', marginTop: '0.25rem' }}>{desc}</div>
        </div>
      </div>
    </div>
  );
};

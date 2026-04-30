/**
 * Temperature proof status display component
 */

import React from 'react';
import { TemperatureProof } from '@veritaschain/types';
import { analyzeProof, ProofVerificationResult } from './verifyProof';

interface TempProofStatusProps {
  proof: TemperatureProof | null;
  isLoading?: boolean;
}

export const TempProofStatus: React.FC<TempProofStatusProps> = ({ proof, isLoading = false }) => {
  const [result, setResult] = React.useState<ProofVerificationResult | null>(null);

  React.useEffect(() => {
    if (proof) {
      analyzeProof(proof).then(setResult);
    }
  }, [proof]);

  if (!proof) {
    return (
      <div className="p-4 bg-gray-100 rounded text-sm text-gray-600">
        No proof available
      </div>
    );
  }

  if (isLoading || !result) {
    return (
      <div className="p-4 bg-blue-50 rounded text-sm text-blue-600">
        Verifying proof...
      </div>
    );
  }

  const bgColor = result.compliant
    ? 'bg-green-50 border-green-300'
    : 'bg-red-50 border-red-300';
  const textColor = result.compliant ? 'text-green-700' : 'text-red-700';
  const icon = result.compliant ? '✓' : '✕';

  return (
    <div className={`border rounded p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${textColor}`}>{icon}</div>
        <div className="flex-1">
          <h4 className={`font-semibold ${textColor}`}>
            {result.compliant ? 'Temperature Compliant' : 'Non-Compliant'}
          </h4>
          <p className="text-sm mt-1">{result.message}</p>

          <div className="mt-3 space-y-1 text-xs">
            <div>
              <span className="text-gray-600">Temperature Range:</span>
              <span className="ml-2">{result.minTemp}°C - {result.maxTemp}°C</span>
            </div>
            <div>
              <span className="text-gray-600">Total Readings:</span>
              <span className="ml-2">{proof.readings.length}</span>
            </div>
            {result.outOfRangeReadings.length > 0 && (
              <div>
                <span className="text-gray-600">Out of Range:</span>
                <span className="ml-2 font-mono">
                  {result.outOfRangeReadings.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { DocumentHash } from '@veritaschain/types';

interface DocumentViewerProps {
  documents: DocumentHash[];
  isDecrypted: boolean;
}

const MOCK_CONTENT: Record<string, string> = {
  'Temp Log': JSON.stringify({ readings: [3.1, 4.2, 3.8, 5.1, 4.9], unit: '°C', interval_min: 15 }, null, 2),
  'Certificate': 'CERTIFICATE OF COMPLIANCE\n-----\nIssuer: Regulatory Authority\nDate: 2026-04-29\nStatus: APPROVED',
  'Compliance Doc': 'COMPLIANCE DOCUMENT\nAll readings within 2°C–8°C range.\nNo anomalies detected.',
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ documents, isDecrypted }) => {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📁 Documents</span>
        <span style={{ fontSize: '0.75rem', color: isDecrypted ? 'var(--emerald)' : 'var(--gray-500)' }}>
          {isDecrypted ? '🔓 Decrypted' : '🔒 Encrypted'}
        </span>
      </div>
      <div className="card-body">
        {documents.map((doc, i) => (
          <div key={i}>
            <div className="document-row">
              <div>
                <div className="document-name">{doc.name}</div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--gray-500)' }}>
                  {doc.hash.slice(0, 14)}…
                </div>
              </div>
              <span className="document-lock">{isDecrypted ? '🔓' : '🔒'}</span>
            </div>
            {isDecrypted && (
              <pre className="document-content">
                {MOCK_CONTENT[doc.name] ?? `[Decrypted content for ${doc.name}]`}
              </pre>
            )}
          </div>
        ))}
        {!isDecrypted && (
          <p className="text-sm" style={{ color: 'var(--gray-500)', textAlign: 'center', paddingTop: '0.5rem' }}>
            Submit a court order to decrypt documents.
          </p>
        )}
      </div>
    </div>
  );
};

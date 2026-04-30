import React, { useState } from 'react';

interface CourtOrderUploadProps {
  shipmentId: string;
  onSubmit?: (file: File) => void;
}

export const CourtOrderUpload: React.FC<CourtOrderUploadProps> = ({ shipmentId, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800)); // simulate verification
    onSubmit?.(file);
    setIsSubmitting(false);
    setDone(true);
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">⚖ Deep Audit Request</span>
      </div>
      <div className="card-body">
        {done ? (
          <div className="alert alert-success">
            ✅ Court order verified. Documents have been decrypted.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
              Regulators may submit a signed court order to access encrypted shipment documents.
            </p>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>
                Shipment ID
              </label>
              <input className="form-input" value={shipmentId} disabled />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>
                Court Order (PDF)
              </label>
              <label
                htmlFor="court-file"
                style={{
                  display: 'block', border: '2px dashed var(--gray-300)', borderRadius: 'var(--radius)',
                  padding: '1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300)'; }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>📄</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                  {file ? file.name : 'Click to upload court order PDF'}
                </p>
              </label>
              <input id="court-file" type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={!file || isSubmitting}
            >
              {isSubmitting ? <><span className="spinner" /> Verifying…</> : '🔓 Submit & Decrypt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import type { ProofType } from '../types/physicalLayer';

interface ProofBadgeProps {
  proofType: ProofType;
  showDetails?: boolean;
}

export default function ProofBadge({ proofType, showDetails = false }: ProofBadgeProps) {
  const isGroth16 = proofType === 'GROTH16';
  return (
    <span
      className={`vc-chip ${isGroth16 ? 'vc-chip-blue' : 'vc-chip-gray'}`}
      title={isGroth16 ? 'Groth16 zero-knowledge proof (~200 bytes)' : 'ECDSA device attestation (fallback)'}
    >
      <span>{isGroth16 ? '🏅' : '🥈'}</span>
      <span>{isGroth16 ? 'Groth16 ZK' : 'ECDSA Fallback'}</span>
      {showDetails && (
        <span style={{ opacity: .7, fontWeight: 400 }}>
          {isGroth16 ? '· ~200b' : '· device-signed'}
        </span>
      )}
    </span>
  );
}

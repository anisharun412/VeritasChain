/**
 * WebAuthn hook for biometric authentication
 */

import { useState, useCallback } from 'react';
import { UserIdentity } from '@veritaschain/types';

interface UseWebAuthnReturn {
  isSupported: boolean;
  isRegistering: boolean;
  isAuthenticating: boolean;
  registerBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<UserIdentity | null>;
  error: string | null;
}

export function useWebAuthn(): UseWebAuthnReturn {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    window.PublicKeyCredential !== undefined &&
    navigator.credentials !== undefined;

  const registerBiometric = useCallback(async () => {
    if (!isSupported) {
      setError('WebAuthn not supported on this device');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'VeritasChain',
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: 'user@veritaschain.local',
          displayName: 'VeritasChain User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
        },
      };

      const credential = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      localStorage.setItem('webauthn_credential_id', credential.id);
      setIsRegistering(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setIsRegistering(false);
    }
  }, [isSupported]);

  const authenticateWithBiometric = useCallback(async (): Promise<UserIdentity | null> => {
    if (!isSupported) {
      setError('WebAuthn not supported on this device');
      return null;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const credentialId = localStorage.getItem('webauthn_credential_id');
      if (!credentialId) {
        throw new Error('No registered credential found');
      }

      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: credentialId as unknown as BufferSource,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'preferred',
      };

      const assertion = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // Create mock user identity
      const identity: UserIdentity = {
        did: 'did:veritaschain:' + Math.random().toString(36).slice(2),
        publicKey: '0x' + Array.from(new Uint8Array(32)).map(x => x.toString(16)).join(''),
        biometricEnrolled: true,
        organization: 'Logistics Co',
      };

      setIsAuthenticating(false);
      return identity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      setIsAuthenticating(false);
      return null;
    }
  }, [isSupported]);

  return {
    isSupported,
    isRegistering,
    isAuthenticating,
    registerBiometric,
    authenticateWithBiometric,
    error,
  };
}

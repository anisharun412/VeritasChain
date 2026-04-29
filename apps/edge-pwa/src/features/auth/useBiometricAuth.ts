import { useState, useCallback } from 'react';
import { deriveKeyFromCredential, exportKey } from './keyDerivation';
import { storeKeyEncrypted, loadKeyEncrypted, clearKeys, hasStoredKey } from './secureStorage';

interface BiometricState {
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  hasCredential: boolean;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({
    isSupported: !!window.PublicKeyCredential,
    isLoading: false,
    error: null,
    hasCredential: false,
  });

  /**
   * Register a new biometric credential (first-time setup).
   * Returns the credential ID on success.
   */
  const register = useCallback(async (userId: string, displayName: string): Promise<Uint8Array | null> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'VeritasChain', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256 (ECDSA P-256)
            { type: 'public-key', alg: -257 },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      if (!credential) throw new Error('Registration cancelled by user.');
      const cred = credential as PublicKeyCredential;
      const credentialId = new Uint8Array(cred.rawId);

      // Derive ECDSA key pair from credential
      const keyPair = await deriveKeyFromCredential(credentialId, userId);
      const jwk = await exportKey(keyPair.privateKey);
      // Embed userId in JWK for later retrieval
      (jwk as JsonWebKey & { kid: string }).kid = userId;

      // Encrypt and store
      await storeKeyEncrypted(jwk, credentialId, userId);

      setState((s) => ({ ...s, isLoading: false, hasCredential: true }));
      return credentialId;
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, error: err.message || 'Registration failed.' }));
      return null;
    }
  }, []);

  /**
   * Authenticate with existing biometric (returning user).
   * Returns the stored userId on success, null on failure.
   */
  const authenticate = useCallback(async (): Promise<string | null> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (!credential) throw new Error('Authentication cancelled by user.');
      const cred = credential as PublicKeyCredential;
      const credentialId = new Uint8Array(cred.rawId);

      const jwk = await loadKeyEncrypted(credentialId);
      if (!jwk) throw new Error('No stored key found. Please register first.');

      const userId = (jwk as JsonWebKey & { kid?: string }).kid || 'authenticated-user';
      setState((s) => ({ ...s, isLoading: false, hasCredential: true }));
      return userId;
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, error: err.message || 'Authentication failed.' }));
      return null;
    }
  }, []);

  const checkCredential = useCallback(async () => {
    const has = await hasStoredKey();
    setState((s) => ({ ...s, hasCredential: has }));
    return has;
  }, []);

  const logout = useCallback(async () => {
    await clearKeys();
    setState((s) => ({ ...s, hasCredential: false }));
  }, []);

  return {
    ...state,
    register,
    authenticate,
    checkCredential,
    logout,
  };
}

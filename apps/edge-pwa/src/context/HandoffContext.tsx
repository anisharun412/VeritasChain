import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  SealResult,
  TempResult,
  ZKResult,
  HandoffBundle,
} from '../types/physicalLayer';

// ─── State shape ──────────────────────────────────────────────────────────────

export type FlowStatus = 'idle' | 'in_progress' | 'completed' | 'contested';

export interface HandoffState {
  currentStep: 1 | 2 | 3 | 4;
  shipmentId: string;
  sealResult: SealResult | null;
  tempResult: TempResult | null;
  zkResult: ZKResult | null;
  handoffBundle: HandoffBundle | null;
  flowStatus: FlowStatus;
}

const initialState: HandoffState = {
  currentStep: 1,
  shipmentId: '',
  sealResult: null,
  tempResult: null,
  zkResult: null,
  handoffBundle: null,
  flowStatus: 'idle',
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_SHIPMENT_ID'; payload: string }
  | { type: 'START_FLOW' }
  | { type: 'SET_SEAL_RESULT'; payload: SealResult }
  | { type: 'SET_TEMP_RESULT'; payload: TempResult }
  | { type: 'SET_ZK_RESULT'; payload: ZKResult }
  | { type: 'NEXT_STEP' }
  | { type: 'COMPLETE_HANDOFF'; payload: HandoffBundle }
  | { type: 'RESET_FLOW' };

function reducer(state: HandoffState, action: Action): HandoffState {
  switch (action.type) {
    case 'SET_SHIPMENT_ID':
      return { ...state, shipmentId: action.payload };
    case 'START_FLOW':
      return { ...state, flowStatus: 'in_progress', currentStep: 1 };
    case 'SET_SEAL_RESULT':
      return { ...state, sealResult: action.payload };
    case 'SET_TEMP_RESULT':
      return { ...state, tempResult: action.payload };
    case 'SET_ZK_RESULT':
      return { ...state, zkResult: action.payload };
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, 4) as 1 | 2 | 3 | 4,
      };
    case 'COMPLETE_HANDOFF':
      return {
        ...state,
        handoffBundle: action.payload,
        flowStatus: action.payload.status === 'CONTESTED' ? 'contested' : 'completed',
      };
    case 'RESET_FLOW':
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface HandoffContextValue {
  state: HandoffState;
  setShipmentId: (id: string) => void;
  startFlow: () => void;
  setSealResult: (r: SealResult) => void;
  setTempResult: (r: TempResult) => void;
  setZkResult: (r: ZKResult) => void;
  nextStep: () => void;
  completeHandoff: (bundle: HandoffBundle) => void;
  resetFlow: () => void;
}

const HandoffContext = createContext<HandoffContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HandoffProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: HandoffContextValue = {
    state,
    setShipmentId: (id) => dispatch({ type: 'SET_SHIPMENT_ID', payload: id }),
    startFlow: () => dispatch({ type: 'START_FLOW' }),
    setSealResult: (r) => dispatch({ type: 'SET_SEAL_RESULT', payload: r }),
    setTempResult: (r) => dispatch({ type: 'SET_TEMP_RESULT', payload: r }),
    setZkResult: (r) => dispatch({ type: 'SET_ZK_RESULT', payload: r }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    completeHandoff: (bundle) => dispatch({ type: 'COMPLETE_HANDOFF', payload: bundle }),
    resetFlow: () => dispatch({ type: 'RESET_FLOW' }),
  };

  return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHandoff(): HandoffContextValue {
  const ctx = useContext(HandoffContext);
  if (!ctx) throw new Error('useHandoff must be used within HandoffProvider');
  return ctx;
}

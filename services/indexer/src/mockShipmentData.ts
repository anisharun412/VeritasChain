/**
 * Realistic cold-chain pharmaceutical routes with pre-computed waypoints.
 * Each route has intermediate GPS coordinates simulating a real journey.
 */

export interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  type: 'origin' | 'checkpoint' | 'warehouse' | 'destination';
  temp: number;      // °C
  freshness: number; // 0-100
}

export interface MockRoute {
  id: string;
  name: string;
  product: string;
  color: string;
  status: 'in-transit' | 'completed' | 'contested';
  waypoints: Waypoint[];
  custodians: string[];
  /** Which waypoint index the "truck" starts at (0-based) */
  startLeg: number;
}

// ─── Route 1: Belgium → Dubai → Mombasa ──────────────────────────

const SHIP001_WAYPOINTS: Waypoint[] = [
  { lat: 50.8467, lng: 4.3525,  label: 'Pfizer Belgium',           type: 'origin',      temp: 4.0, freshness: 100 },
  { lat: 50.4500, lng: 5.7000,  label: 'Brussels Ring → Liège',    type: 'checkpoint',  temp: 4.1, freshness: 99  },
  { lat: 49.0100, lng: 8.4000,  label: 'Karlsruhe DE',             type: 'checkpoint',  temp: 4.1, freshness: 98  },
  { lat: 48.1351, lng: 11.5820, label: 'Munich Airport Hub',       type: 'warehouse',   temp: 4.2, freshness: 97  },
  { lat: 45.4640, lng: 9.1900,  label: 'Milan Cargo Terminal',     type: 'checkpoint',  temp: 4.3, freshness: 97  },
  { lat: 37.9838, lng: 23.7275, label: 'Athens Transfer Hub',      type: 'warehouse',   temp: 4.5, freshness: 96  },
  { lat: 35.1980, lng: 33.3500, label: 'Nicosia Stopover',         type: 'checkpoint',  temp: 4.4, freshness: 96  },
  { lat: 30.5852, lng: 36.2384, label: 'Aqaba Cold Store',         type: 'warehouse',   temp: 4.6, freshness: 95  },
  { lat: 25.2048, lng: 55.2708, label: 'Dubai Cold Storage Hub',   type: 'warehouse',   temp: 4.3, freshness: 95  },
  { lat: 22.0000, lng: 50.0000, label: 'Arabian Sea Flyover',      type: 'checkpoint',  temp: 4.5, freshness: 94  },
  { lat: 12.0000, lng: 44.0000, label: 'Gulf of Aden',             type: 'checkpoint',  temp: 4.6, freshness: 94  },
  { lat:  2.0000, lng: 41.0000, label: 'Kenya Airspace',           type: 'checkpoint',  temp: 4.8, freshness: 93  },
  { lat: -4.0435, lng: 39.6682, label: 'Mombasa Port Customs',     type: 'warehouse',   temp: 4.8, freshness: 93  },
  { lat: -4.0523, lng: 39.6499, label: 'Mombasa General Hospital', type: 'destination', temp: 4.9, freshness: 93  },
];

// ─── Route 2: Belgium → Frankfurt → Nairobi ──────────────────────

const SHIP002_WAYPOINTS: Waypoint[] = [
  { lat: 50.8467, lng: 4.3525,  label: 'Pfizer Belgium',           type: 'origin',      temp: 4.0, freshness: 100 },
  { lat: 50.0379, lng: 8.5622,  label: 'Frankfurt DHL Hub',        type: 'warehouse',   temp: 4.1, freshness: 99  },
  { lat: 44.0000, lng: 20.0000, label: 'Belgrade Flyover',         type: 'checkpoint',  temp: 4.2, freshness: 98  },
  { lat: 41.0082, lng: 28.9784, label: 'Istanbul Cargo Hub',       type: 'warehouse',   temp: 4.3, freshness: 97  },
  { lat: 35.0000, lng: 35.0000, label: 'Eastern Med',              type: 'checkpoint',  temp: 4.4, freshness: 97  },
  { lat: 25.2048, lng: 55.2708, label: 'Dubai Transit',            type: 'checkpoint',  temp: 4.3, freshness: 96  },
  { lat: 12.0000, lng: 45.0000, label: 'Horn of Africa',           type: 'checkpoint',  temp: 4.6, freshness: 95  },
  { lat: -1.2921, lng: 36.8219, label: 'JKIA Nairobi Cargo',       type: 'warehouse',   temp: 4.7, freshness: 95  },
  { lat: -1.2864, lng: 36.8172, label: 'Nairobi Central Pharmacy', type: 'destination', temp: 4.8, freshness: 95  },
];

// ─── Route 3: Novo Nordisk → Dubai Hospital (contested) ──────────

const SHIP003_WAYPOINTS: Waypoint[] = [
  { lat: 55.6761, lng: 12.5683, label: 'Novo Nordisk Copenhagen',  type: 'origin',      temp: 4.0, freshness: 100 },
  { lat: 53.5753, lng: 10.0153, label: 'Hamburg Cold Store',       type: 'warehouse',   temp: 4.2, freshness: 98  },
  { lat: 52.3676, lng: 4.9041,  label: 'Amsterdam Schiphol',       type: 'checkpoint',  temp: 4.3, freshness: 97  },
  { lat: 48.8566, lng: 2.3522,  label: 'Paris CDG Hub',            type: 'checkpoint',  temp: 5.8, freshness: 85  }, // BREACH
  { lat: 43.0000, lng: 12.0000, label: 'Rome Flyover',             type: 'checkpoint',  temp: 9.2, freshness: 68  }, // BREACH
  { lat: 36.0000, lng: 22.0000, label: 'Mediterranean Sea',        type: 'checkpoint',  temp: 11.0, freshness: 60  }, // BREACH
  { lat: 25.2048, lng: 55.2708, label: 'Dubai Arrival — CONTESTED',type: 'destination', temp: 11.4, freshness: 61  },
];

// ─── Route registry ───────────────────────────────────────────────

export const MOCK_ROUTES: MockRoute[] = [
  {
    id: 'SHIP-001',
    name: 'Vaccine Batch 47B',
    product: 'mRNA COVID-19 Vaccine',
    color: '#3B82F6',
    status: 'in-transit',
    startLeg: 8,  // Start at Dubai (mid-journey)
    custodians: ['🏭 Pfizer Belgium', '✈️ DHL Air Cargo', '🏥 Mombasa Hospital'],
    waypoints: SHIP001_WAYPOINTS,
  },
  {
    id: 'SHIP-002',
    name: 'Vaccine Batch 48A',
    product: 'mRNA COVID-19 Vaccine',
    color: '#10B981',
    status: 'in-transit',
    startLeg: 5,  // Start at Dubai
    custodians: ['🏭 Pfizer Belgium', '✈️ FedEx Air', '🏥 Nairobi Pharmacy'],
    waypoints: SHIP002_WAYPOINTS,
  },
  {
    id: 'SHIP-003',
    name: 'Insulin Batch 12C',
    product: 'Long-acting Insulin',
    color: '#EF4444',
    status: 'contested',
    startLeg: 6,  // Arrive contested
    custodians: ['🏭 Novo Nordisk', '✈️ FedEx Air', '🏥 Dubai Hospital'],
    waypoints: SHIP003_WAYPOINTS,
  },
];

/** Interpolate two lat/lng points for smooth animation */
export function interpolate(
  a: Waypoint, b: Waypoint, t: number
): { lat: number; lng: number; temp: number; freshness: number } {
  return {
    lat:       a.lat       + (b.lat       - a.lat)       * t,
    lng:       a.lng       + (b.lng       - a.lng)       * t,
    temp:      a.temp      + (b.temp      - a.temp)      * t,
    freshness: a.freshness + (b.freshness - a.freshness) * t,
  };
}

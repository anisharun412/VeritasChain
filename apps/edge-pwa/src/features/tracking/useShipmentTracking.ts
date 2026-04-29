import { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_ROUTES, interpolate, Waypoint, MockRoute } from './mockShipmentData';
import { UserRole } from '../auth/roles';

export interface LiveShipment {
  id: string;
  name: string;
  product: string;
  color: string;
  status: 'in-transit' | 'completed' | 'contested';
  // Current truck position
  currentLat: number;
  currentLng: number;
  currentTemp: number;
  currentFreshness: number;
  // Route history (all visited waypoints)
  visitedWaypoints: Waypoint[];
  // Named stop markers (origin, warehouses, destination)
  allWaypoints: Waypoint[];
  custodians: string[];
  lastUpdateTime: number;
}

const TICK_MS  = 2000;   // Update every 2 seconds
const SPEED    = 0.06;   // How much to advance per tick (0-1 across a leg)

export function useShipmentTracking(userRole: UserRole | null, shipmentId?: string) {
  const [shipments, setShipments] = useState<LiveShipment[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const progressRef = useRef<Record<string, number>>({}); // shipmentId → 0..n (waypoint progress)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Try Socket.io, fall back to mock simulation ──────────────────

  const trySocket = useCallback(() => {
    const url = (import.meta as any).env?.VITE_TRACKING_SERVER_URL || 'http://localhost:3001';

    try {
      // Dynamic import to avoid blocking if socket.io-client has issues
      import('socket.io-client').then(({ io }) => {
        const socket = io(url, { timeout: 2000, reconnection: false });
        socket.on('connect', () => {
          setIsConnected(true);
          setIsLive(true);
          if (shipmentId) socket.emit('subscribe', { shipmentId });
          else socket.emit('subscribe:all');
        });
        socket.on('location_update', (data: LiveShipment[]) => {
          setShipments(data);
        });
        socket.on('connect_error', () => {
          socket.disconnect();
          startMockSimulation();
        });
        socket.on('disconnect', () => {
          setIsConnected(false);
        });
      }).catch(() => startMockSimulation());
    } catch {
      startMockSimulation();
    }
  }, [shipmentId]);

  // ─── Mock GPS simulation ──────────────────────────────────────────

  const startMockSimulation = useCallback(() => {
    setIsLive(true);
    setIsConnected(false);

    // Initialize progress for each route
    MOCK_ROUTES.forEach((route) => {
      if (!progressRef.current[route.id]) {
        progressRef.current[route.id] = route.startLeg;
      }
    });

    // Initialize shipments
    setShipments(buildShipments());

    // Advance simulation tick
    intervalRef.current = setInterval(() => {
      MOCK_ROUTES.forEach((route) => {
        const maxProgress = route.waypoints.length - 1;
        if (progressRef.current[route.id] < maxProgress) {
          if (route.status !== 'contested') {
            progressRef.current[route.id] = Math.min(
              progressRef.current[route.id] + SPEED,
              maxProgress,
            );
          }
        }
      });
      setShipments(buildShipments());
    }, TICK_MS);
  }, []);

  function buildShipments(): LiveShipment[] {
    return MOCK_ROUTES.map((route) => {
      const progress = progressRef.current[route.id] ?? route.startLeg;
      const legFloor = Math.floor(progress);
      const legT     = progress - legFloor;
      const waypointA = route.waypoints[Math.min(legFloor,     route.waypoints.length - 1)];
      const waypointB = route.waypoints[Math.min(legFloor + 1, route.waypoints.length - 1)];
      const current = interpolate(waypointA, waypointB, legT);

      const visited = route.waypoints.slice(0, legFloor + 1);

      return {
        id:                route.id,
        name:              route.name,
        product:           route.product,
        color:             route.color,
        status:            route.status,
        currentLat:        current.lat,
        currentLng:        current.lng,
        currentTemp:       parseFloat(current.temp.toFixed(1)),
        currentFreshness:  Math.round(current.freshness),
        visitedWaypoints:  visited,
        allWaypoints:      route.waypoints,
        custodians:        route.custodians,
        lastUpdateTime:    Date.now(),
      };
    });
  }

  // ─── Filter by role ───────────────────────────────────────────────

  const visibleShipments = shipments.filter((s) => {
    if (!userRole) return false;
    if (userRole === UserRole.REGULATOR) return true;     // sees all
    if (shipmentId) return s.id === shipmentId;
    if (userRole === UserRole.MANUFACTURER) return ['SHIP-001', 'SHIP-002'].includes(s.id);
    if (userRole === UserRole.CARRIER)      return ['SHIP-001', 'SHIP-002', 'SHIP-003'].includes(s.id);
    if (userRole === UserRole.RECEIVER)     return ['SHIP-001'].includes(s.id);
    return false;
  });

  // ─── Lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    trySocket();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stats = {
    total:      visibleShipments.length,
    inTransit:  visibleShipments.filter((s) => s.status === 'in-transit').length,
    contested:  visibleShipments.filter((s) => s.status === 'contested').length,
    avgFreshness: visibleShipments.length
      ? Math.round(visibleShipments.reduce((a, s) => a + s.currentFreshness, 0) / visibleShipments.length)
      : 0,
  };

  return { shipments: visibleShipments, isLive, isConnected, stats };
}

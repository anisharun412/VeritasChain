import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import { MOCK_ROUTES, interpolate, Waypoint, MockRoute } from './mockShipmentData';

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

export interface LiveShipment {
  id: string;
  name: string;
  product: string;
  color: string;
  status: 'in-transit' | 'completed' | 'contested';
  currentLat: number;
  currentLng: number;
  currentTemp: number;
  currentFreshness: number;
  visitedWaypoints: Waypoint[];
  allWaypoints: Waypoint[];
  custodians: string[];
  lastUpdateTime: number;
}

const TICK_MS = 2000;
const SPEED = 0.06;

// Track progress for all shipments on the backend
const progressMap: Record<string, number> = {};

MOCK_ROUTES.forEach((route) => {
  progressMap[route.id] = route.startLeg;
});

function buildShipments(): LiveShipment[] {
  return MOCK_ROUTES.map((route) => {
    const progress = progressMap[route.id] ?? route.startLeg;
    const legFloor = Math.floor(progress);
    const legT = progress - legFloor;
    const waypointA = route.waypoints[Math.min(legFloor, route.waypoints.length - 1)];
    const waypointB = route.waypoints[Math.min(legFloor + 1, route.waypoints.length - 1)];
    const current = interpolate(waypointA, waypointB, legT);

    const visited = route.waypoints.slice(0, legFloor + 1);

    return {
      id: route.id,
      name: route.name,
      product: route.product,
      color: route.color,
      status: route.status as 'in-transit' | 'completed' | 'contested',
      currentLat: current.lat,
      currentLng: current.lng,
      currentTemp: parseFloat(current.temp.toFixed(1)),
      currentFreshness: Math.round(current.freshness),
      visitedWaypoints: visited,
      allWaypoints: route.waypoints,
      custodians: route.custodians,
      lastUpdateTime: Date.now(),
    };
  });
}

// Tick loop
setInterval(() => {
  let changed = false;
  MOCK_ROUTES.forEach((route) => {
    const maxProgress = route.waypoints.length - 1;
    if (progressMap[route.id] < maxProgress && route.status !== 'contested') {
      progressMap[route.id] = Math.min(progressMap[route.id] + SPEED, maxProgress);
      changed = true;
    }
  });

  if (changed) {
    const shipments = buildShipments();
    io.emit('location_update', shipments);
  }
}, TICK_MS);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe:all', () => {
    console.log(`Client ${socket.id} subscribed to all shipments`);
    socket.emit('location_update', buildShipments());
  });

  socket.on('subscribe', ({ shipmentId }) => {
    console.log(`Client ${socket.id} subscribed to shipment: ${shipmentId}`);
    socket.emit('location_update', buildShipments().filter(s => s.id === shipmentId));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeShipments: Object.keys(progressMap).length });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Tracking server running on http://localhost:${PORT}`);
});

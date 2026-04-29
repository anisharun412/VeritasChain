import React, { useEffect, useMemo } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveShipment, useShipmentTracking } from './useShipmentTracking';
import { UserRole } from '../auth/roles';
import { useNavigate } from 'react-router-dom';

// ─── Fix Leaflet default icon URLs in Vite ────────────────────────
// (Must happen before any MapContainer renders)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Emoji div icons (no URL issues) ─────────────────────────────

function makeIcon(emoji: string, size = 34) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ICONS = {
  origin:      makeIcon('🏭', 36),
  warehouse:   makeIcon('📦', 32),
  checkpoint:  makeIcon('📍', 26),
  destination: makeIcon('🏥', 36),
  truck:       makeIcon('🚛', 38),
  alert:       makeIcon('⚠️', 36),
};

// ─── Auto-fit map bounds ──────────────────────────────────────────

function MapFitter({ shipments }: { shipments: LiveShipment[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = shipments.flatMap((s) =>
      s.allWaypoints.map((w) => [w.lat, w.lng] as [number, number]),
    );
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 10 });
  }, [shipments.length]);
  return null;
}

// ─── Temperature color ────────────────────────────────────────────

function tempColor(t: number) {
  if (t <= 8) return '#10B981';
  if (t <= 10) return '#F59E0B';
  return '#EF4444';
}

// ─── Individual shipment popup ────────────────────────────────────

function ShipmentPopup({
  shipment, userRole, onFlag, onHandoff,
}: {
  shipment: LiveShipment;
  userRole: UserRole | null;
  onFlag: (id: string) => void;
  onHandoff: (id: string) => void;
}) {
  return (
    <div style={{ minWidth: 220, fontSize: '0.82rem', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
        {shipment.status === 'contested' ? '⚠️ ' : '📦 '}{shipment.name}
      </div>
      <div style={{ color: '#6B7280', marginBottom: '0.6rem', fontSize: '0.75rem' }}>
        {shipment.product}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
        <Row label="Freshness">
          <span style={{
            fontWeight: 700,
            color: shipment.currentFreshness >= 80 ? '#065f46'
                 : shipment.currentFreshness >= 60 ? '#78350f' : '#991b1b',
          }}>
            {shipment.currentFreshness}/100
          </span>
        </Row>
        <Row label="Temperature">
          <span style={{ fontWeight: 700, color: tempColor(shipment.currentTemp) }}>
            {shipment.currentTemp}°C {shipment.currentTemp > 8 ? '🔴' : '✅'}
          </span>
        </Row>
        <Row label="Status">
          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
            {shipment.status.replace('-', ' ')}
          </span>
        </Row>
        <Row label="Custodians">
          <span style={{ fontSize: '0.72rem', color: '#4B5563' }}>
            {shipment.custodians.length} parties
          </span>
        </Row>
      </div>

      {/* Role-specific actions */}
      {userRole === UserRole.REGULATOR && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            onClick={() => onFlag(shipment.id)}
            style={actionBtn('#EF4444')}
          >
            🚩 Flag for Deep Audit
          </button>
        </div>
      )}
      {userRole === UserRole.CARRIER && shipment.status === 'in-transit' && (
        <button onClick={() => onHandoff(shipment.id)} style={actionBtn('#3B82F6')}>
          🚛 Initiate Handoff Here
        </button>
      )}
      {userRole === UserRole.RECEIVER && (
        <button onClick={() => onHandoff(shipment.id)} style={actionBtn('#10B981')}>
          📥 Accept Incoming Delivery
        </button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#9CA3AF' }}>{label}:</span>
      {children}
    </div>
  );
}

function actionBtn(bg: string) {
  return {
    width: '100%', padding: '0.45rem', background: bg, color: '#fff',
    border: 'none', borderRadius: '0.4rem', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.8rem',
  } as React.CSSProperties;
}

// ─── Main ShipmentMap ─────────────────────────────────────────────

interface ShipmentMapProps {
  userRole: UserRole | null;
  shipmentId?: string;
  height?: string;
}

export default function ShipmentMap({ userRole, shipmentId, height = '100%' }: ShipmentMapProps) {
  const { shipments, isLive, isConnected, stats } = useShipmentTracking(userRole, shipmentId);
  const navigate = useNavigate();

  const onFlag    = (id: string) => alert(`Flagging ${id} for deep audit — submitted to regulator dashboard`);
  const onHandoff = (id: string) => navigate(`/handoff/receive/${id}`);

  const centerPos = useMemo((): [number, number] => {
    if (shipments.length > 0) {
      const s = shipments[0];
      return [s.currentLat, s.currentLng];
    }
    return [20, 30]; // Africa-Europe view
  }, []);

  return (
    <div style={{ position: 'relative', height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}>

      {/* ── Live indicator ── */}
      <div style={{
        position: 'absolute', top: '0.75rem', right: '0.75rem',
        zIndex: 1000, background: 'rgba(15,32,39,0.85)',
        backdropFilter: 'blur(8px)', borderRadius: '0.5rem',
        padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isConnected ? '#10B981' : '#F59E0B',
          boxShadow: `0 0 6px ${isConnected ? '#10B981' : '#F59E0B'}`,
          animation: 'pulse 1.5s infinite',
        }} />
        <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}>
          {isConnected ? 'LIVE — Socket.io' : 'LIVE SIMULATION'}
        </span>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        position: 'absolute', top: '0.75rem', left: '0.75rem',
        zIndex: 1000, display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Tracking', value: stats.total, color: '#3B82F6' },
          { label: 'In Transit', value: stats.inTransit, color: '#10B981' },
          { label: 'Contested', value: stats.contested, color: '#EF4444' },
          { label: 'Avg Freshness', value: `${stats.avgFreshness}%`, color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'rgba(15,32,39,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem',
            padding: '0.3rem 0.7rem', color: '#fff', fontSize: '0.72rem',
          }}>
            <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
            {' '}<span style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Map ── */}
      <MapContainer
        center={centerPos}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitter shipments={shipments} />

        {shipments.map((shipment) => (
          <React.Fragment key={shipment.id}>

            {/* Route trail (visited waypoints) */}
            {shipment.visitedWaypoints.length >= 2 && (
              <Polyline
                positions={shipment.visitedWaypoints.map((w) => [w.lat, w.lng])}
                pathOptions={{
                  color: shipment.color,
                  weight: 4,
                  opacity: 0.7,
                  dashArray: shipment.status === 'contested' ? '12 8' : undefined,
                }}
              />
            )}

            {/* Dashed future route */}
            {shipment.allWaypoints.length > shipment.visitedWaypoints.length && (
              <Polyline
                positions={[
                  ...shipment.visitedWaypoints.slice(-1).map((w) => [w.lat, w.lng]),
                  ...shipment.allWaypoints
                    .slice(shipment.visitedWaypoints.length)
                    .map((w) => [w.lat, w.lng]),
                ] as [number, number][]}
                pathOptions={{ color: shipment.color, weight: 2, opacity: 0.3, dashArray: '6 8' }}
              />
            )}

            {/* Named stop markers (origin, warehouses, destination only) */}
            {shipment.allWaypoints
              .filter((w) => w.type !== 'checkpoint')
              .map((w, i) => (
                <Marker
                  key={`${shipment.id}-stop-${i}`}
                  position={[w.lat, w.lng]}
                  icon={ICONS[w.type]}
                >
                  <Popup>
                    <div style={{ fontSize: '0.82rem', minWidth: 180 }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{w.label}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9CA3AF' }}>Temp:</span>
                        <span style={{ fontWeight: 700, color: tempColor(w.temp) }}>{w.temp}°C</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9CA3AF' }}>Freshness:</span>
                        <span style={{ fontWeight: 700 }}>{w.freshness}/100</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Animated truck at current position */}
            <Marker
              position={[shipment.currentLat, shipment.currentLng]}
              icon={shipment.status === 'contested' ? ICONS.alert : ICONS.truck}
              zIndexOffset={1000}
            >
              <Popup maxWidth={260}>
                <ShipmentPopup
                  shipment={shipment}
                  userRole={userRole}
                  onFlag={onFlag}
                  onHandoff={onHandoff}
                />
              </Popup>
            </Marker>

          </React.Fragment>
        ))}
      </MapContainer>

      {/* ── Legend ── */}
      <div style={{
        position: 'absolute', bottom: '2.5rem', left: '0.75rem', zIndex: 1000,
        background: 'rgba(15,32,39,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem',
        padding: '0.65rem 0.9rem', color: '#fff', fontSize: '0.72rem',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>LEGEND</div>
        {[
          ['🏭', 'Origin (Manufacturer)'],
          ['📦', 'Warehouse / Hub'],
          ['🚛', 'In Transit'],
          ['🏥', 'Final Destination'],
          ['⚠️', 'Contested / Alert'],
        ].map(([icon, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

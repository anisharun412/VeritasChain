import React, { useState, useEffect } from 'react';

export default function LiveTemperatureChart() {
  const [data, setData] = useState<{ time: string; temp: number }[]>([]);
  const [currentTemp, setCurrentTemp] = useState(4.2);
  const [warning, setWarning] = useState(false);
  const [freshness, setFreshness] = useState(98);

  useEffect(() => {
    // Initialize with 20 data points
    const initialData = [];
    let temp = 4.0;
    for (let i = 20; i >= 0; i--) {
      const d = new Date(Date.now() - i * 1000);
      temp += (Math.random() - 0.5) * 0.8;
      initialData.push({ time: d.toLocaleTimeString().slice(0, 5), temp });
    }
    setData(initialData);

    const interval = setInterval(() => {
      setData(prev => {
        let lastTemp = prev[prev.length - 1].temp;
        // Tendency to drift upwards occasionally, then correct
        let change = (Math.random() - 0.45) * 0.9;
        
        // Randomly simulate a spike every ~20 seconds
        if (Math.random() > 0.95) {
          change += 2.5; 
        }

        let newTemp = lastTemp + change;
        if (newTemp < 2) newTemp = 2 + Math.random(); // Keep above 2C usually
        if (newTemp > 10) newTemp = 10 - Math.random(); // Cap at 10C

        setCurrentTemp(newTemp);
        
        // Update freshness and warnings
        if (newTemp > 8.0) {
          setWarning(true);
          setFreshness(f => Math.max(0, f - 2)); // Drop freshness on spikes
        } else {
          setWarning(false);
        }

        const newPoint = { time: new Date().toLocaleTimeString().slice(0, 5), temp: newTemp };
        return [...prev.slice(1), newPoint];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Simple SVG charting
  const minTemp = 0;
  const maxTemp = 12;
  const width = 300;
  const height = 120;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.temp - minTemp) / (maxTemp - minTemp)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{
      position: 'absolute', top: 20, right: 20, zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
      padding: 16, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      width: 320, border: warning ? '2px solid #EF4444' : '1px solid #e2e8f0',
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Live IoT Sensor (SHIP-2024-001)</h3>
        <div style={{
          background: warning ? '#fef2f2' : '#f0fdf4', color: warning ? '#dc2626' : '#16a34a',
          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800,
          animation: warning ? 'pulse 1s infinite' : 'none'
        }}>
          {currentTemp.toFixed(1)}°C
        </div>
      </div>

      <div style={{ position: 'relative', height: height, width: '100%', marginBottom: 12 }}>
        {/* Safe zone indicator */}
        <div style={{
          position: 'absolute', width: '100%', background: 'rgba(16, 185, 129, 0.1)',
          top: height - ((8 - minTemp) / (maxTemp - minTemp)) * height,
          bottom: height - ((2 - minTemp) / (maxTemp - minTemp)) * height,
          zIndex: 1, borderTop: '1px dashed rgba(16, 185, 129, 0.5)', borderBottom: '1px dashed rgba(16, 185, 129, 0.5)'
        }} />
        
        {/* 8C limit line */}
        <div style={{
          position: 'absolute', width: '100%', top: height - ((8 - minTemp) / (maxTemp - minTemp)) * height,
          borderTop: '1px dashed #EF4444', zIndex: 2
        }}><span style={{ fontSize: 9, color: '#EF4444', position: 'absolute', right: 0, top: -14 }}>8°C MAX</span></div>

        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ position: 'absolute', zIndex: 3 }}>
          <polyline
            points={points}
            fill="none"
            stroke={warning ? '#EF4444' : '#3B82F6'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>ZK Freshness Score:</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: freshness < 90 ? '#EF4444' : '#10B981' }}>{freshness}%</span>
      </div>

      {warning && (
        <div style={{ marginTop: 8, background: '#EF4444', color: '#fff', fontSize: 11, padding: 6, borderRadius: 6, textAlign: 'center', fontWeight: 600 }}>
          ⚠️ ALARM: Temperature exceeded 8°C!
        </div>
      )}
    </div>
  );
}

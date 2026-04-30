import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import { UserRole } from '../auth/roles';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const freshnessData = [
  { range: '90-100', count: 145 },
  { range: '80-89', count: 85 },
  { range: '70-79', count: 32 },
  { range: '60-69', count: 15 },
  { range: '50-59', count: 8 },
  { range: '< 50', count: 3 },
];

const timelineData = [
  { date: 'Nov 24', compliant: 45, contested: 2 },
  { date: 'Nov 25', compliant: 52, contested: 0 },
  { date: 'Nov 26', compliant: 48, contested: 3 },
  { date: 'Nov 27', compliant: 61, contested: 1 },
  { date: 'Nov 28', compliant: 59, contested: 4 },
  { date: 'Nov 29', compliant: 68, contested: 2 },
  { date: 'Nov 30', compliant: 71, contested: 1 },
];

const carrierData = [
  { name: 'DHL Cold Chain', compliant: 120, contested: 2, avgFreshness: 94 },
  { name: 'FedEx Healthcare', compliant: 85, contested: 5, avgFreshness: 89 },
  { name: 'Maersk Logistics', compliant: 64, contested: 1, avgFreshness: 92 },
  { name: 'Regional Trans', compliant: 28, contested: 4, avgFreshness: 81 },
];

const anomalyTypes = [
  { name: 'Temp Excursion', value: 45, color: '#F59E0B' },
  { name: 'Seal Broken', value: 12, color: '#EF4444' },
  { name: 'ZK Proof Failed', value: 8, color: '#8B5CF6' },
  { name: 'Document Hash Mismatch', value: 15, color: '#3B82F6' },
];

export default function RegulatorStatsPage() {
  const { displayName, organization } = useAuth();
  const { roleDefinition } = useRoleAccess();

  return (
    <DashboardShell
      accentColor="#8B5CF6"
      icon="📊"
      title={organization || 'Regulator Analytics'}
      subtitle={`${displayName} · Compliance Overview`}
    >
      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Audits This Month', value: '1,248', trend: '+12%', color: '#3B82F6' },
          { label: 'Overall Compliance Rate', value: '96.4%', trend: '+0.8%', color: '#10B981' },
          { label: 'Average Freshness Score', value: '91.2', trend: '-1.4', color: '#F59E0B' },
          { label: 'Critical Anomalies', value: '23', trend: '-5', color: '#EF4444' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{stat.value}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: stat.trend.startsWith('+') ? '#10B981' : '#EF4444' }}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Compliance Timeline */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0f172a' }}>7-Day Compliance Trend</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                <Area type="monotone" dataKey="compliant" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Compliant Handoffs" />
                <Area type="monotone" dataKey="contested" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} name="Contested Handoffs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Freshness Distribution */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0f172a' }}>Freshness Score Distribution</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freshnessData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {freshnessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.range === '90-100' || entry.range === '80-89' ? '#10B981' :
                      entry.range === '70-79' || entry.range === '60-69' ? '#F59E0B' : '#EF4444'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carrier Performance */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0f172a' }}>Carrier Performance</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carrierData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 500 }} dx={-10} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                <Bar dataKey="compliant" stackId="a" fill="#10B981" name="Compliant" radius={[0, 0, 0, 0]} barSize={24} />
                <Bar dataKey="contested" stackId="a" fill="#EF4444" name="Contested" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0f172a' }}>Anomaly Breakdown</h3>
          <div style={{ height: 300, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={anomalyTypes} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}
                  dataKey="value" stroke="none" labelLine={false}
                >
                  {anomalyTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12, lineHeight: '24px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// frontend/src/pages/Dashboard/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,22,40,0.96)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px',
      fontSize: '0.78rem', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData]   = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.sarpanch({ village_id: user?.village_id }).then(r => setData(r.data)),
      dashboardAPI.monthlyTrend({ village_id: user?.village_id }).then(r => setTrend(r.data || [])).catch(() => {}),
    ])
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [user?.village_id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner spinner-lg" />
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading village data...</div>
    </div>
  );

  if (!data) return null;

  const getSafeInt = (val) => isNaN(parseInt(val)) ? 0 : parseInt(val);

  const households = data?.households || { total: 0, applied: 0, installed: 0, target: 1 };
  const farmers    = data?.farmers    || { total: 0, applied: 0, installed: 0, target: 1 };
  const land_plant = data?.land_plant || { total: 0, installed: 0, target_mw: 2 };
  const village_score       = data?.village_score || 0;
  const co2_saved           = data?.co2_saved || 0;
  const trees_equivalent    = data?.trees_equivalent || 0;
  const pending_applications = data?.pending_applications || 0;
  const open_complaints      = data?.open_complaints || 0;

  const hhTarget = Math.max(1, getSafeInt(households.target));
  const hhPct    = Math.min(100, Math.round((getSafeInt(households.installed) / hhTarget) * 100)) || 0;

  const fmTarget = Math.max(1, getSafeInt(farmers.target));
  const fmPct    = Math.min(100, Math.round((getSafeInt(farmers.installed) / fmTarget) * 100)) || 0;

  const scorePct = getSafeInt(village_score) || 0;
  const statusColor = hhPct >= 80 ? '#10B981' : hhPct >= 50 ? '#F5A623' : '#F43F5E';

  const installedHH = getSafeInt(households.installed);
  const appliedHH   = getSafeInt(households.applied);
  const totalHH     = getSafeInt(households.total);
  const pendingHH   = Math.max(0, totalHH - installedHH - appliedHH);

  const pieData = [
    { name: 'Installed', value: installedHH },
    { name: 'Applied',   value: appliedHH },
    { name: 'Pending',   value: pendingHH },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🌞 Village Dashboard</div>
          <div className="page-subheading">
            {data.village?.name}
            <span className="page-subheading-dot" />
            {user?.mandal_name} Mandal
            <span className="page-subheading-dot" />
            {user?.district_name}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>📊 Reports</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/farmers')}>+ Add Farmer</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/households')}>+ Add Household</button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>

        {/* Rooftop Solar */}
        <div className="stat-card gold" style={{ cursor: 'pointer' }} onClick={() => navigate('/households')}>
          <div className="stat-icon gold">🏠</div>
          <div style={{ paddingTop: 8 }}>
            <div className="stat-value" style={{ color: 'var(--solar-gold)' }}>{hhPct}%</div>
            <div className="stat-label">Rooftop Coverage</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
              {installedHH} / {hhTarget} installed
            </div>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill gold" style={{ width: `${hhPct}%` }} />
          </div>
        </div>

        {/* Solar Pumps */}
        <div className="stat-card green" style={{ cursor: 'pointer' }} onClick={() => navigate('/farmers')}>
          <div className="stat-icon green">💧</div>
          <div style={{ paddingTop: 8 }}>
            <div className="stat-value" style={{ color: 'var(--emerald-light)' }}>{fmPct}%</div>
            <div className="stat-label">Pump Coverage</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
              {getSafeInt(farmers.installed)} / {fmTarget} installed
            </div>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill green" style={{ width: `${fmPct}%` }} />
          </div>
        </div>

        {/* Land Plant */}
        <div className="stat-card blue" style={{ cursor: 'pointer' }} onClick={() => navigate('/land')}>
          <div className="stat-icon blue">⚡</div>
          <div style={{ paddingTop: 8 }}>
            <div className="stat-value" style={{ color: 'var(--sky)' }}>
              {land_plant.installed > 0 ? '✅' : land_plant.total > 0 ? '⏳' : '—'}
            </div>
            <div className="stat-label">Land Solar Plant</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
              Target: {land_plant.target_mw || 2} MW
              {land_plant.total > 0 ? ` · ${land_plant.total} identified` : ''}
            </div>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill blue" style={{ width: `${land_plant.installed > 0 ? 100 : land_plant.total > 0 ? 30 : 5}%` }} />
          </div>
        </div>

        {/* Village Score */}
        <div className="stat-card purple">
          <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `conic-gradient(${statusColor} ${scorePct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'var(--bg-850)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: statusColor,
              }}>{scorePct}</div>
            </div>
          </div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🏆</div>
            <div className="stat-label">Village Score</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
              {scorePct >= 80 ? '🟢 Solar Champion' : scorePct >= 50 ? '🟡 In Progress' : '🔴 Needs Push'}
            </div>
            <div style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 600, marginTop: 6 }}>
              100% Solar Target
            </div>
          </div>
        </div>
      </div>

      {/* ── SECONDARY KPI ROW ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { icon: '🏠', val: totalHH, label: 'Total Households', sub: `${appliedHH} applied · ${pendingHH} not applied`, color: 'var(--text-primary)', onClick: () => navigate('/households') },
          { icon: '🌾', val: getSafeInt(farmers.total), label: 'Total Farmers', sub: `${getSafeInt(farmers.applied)} applied · ${Math.max(0, getSafeInt(farmers.total) - getSafeInt(farmers.installed) - getSafeInt(farmers.applied))} not applied`, color: 'var(--text-primary)', onClick: () => navigate('/farmers') },
          { icon: '🌿', val: co2_saved, label: 'Tons CO₂ Saved', sub: `≈ ${trees_equivalent} trees planted`, color: 'var(--emerald-light)', onClick: () => navigate('/reports') },
          { icon: '⚠️', val: `${pending_applications}`, label: 'Pending',
            sub: `${open_complaints} open tickets`,
            color: pending_applications > 0 ? 'var(--rose)' : 'var(--emerald-light)',
            onClick: () => navigate('/applications') },
        ].map(s => (
          <div key={s.label} className="card" style={{ cursor: s.onClick ? 'pointer' : 'default', padding: 'var(--space-4)' }}
            onClick={s.onClick}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)' }}>

        {/* Area Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <div className="card-title">📈 Monthly Progress</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>Solar installations over time</div>
            </div>
            <span className="badge badge-installed">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend.length > 0 ? trend : [{ m: '—', hh: 0, fm: 0 }]}>
              <defs>
                <linearGradient id="hhGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#F5A623" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="fmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="hh" stroke="#F5A623" strokeWidth={2} fill="url(#hhGrad)" name="Households" dot={false} />
              <Area type="monotone" dataKey="fm" stroke="#10B981" strokeWidth={2} fill="url(#fmGrad)" name="Farmers" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 3, borderRadius: 3, background: '#F5A623' }} />Households
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 3, borderRadius: 3, background: '#10B981' }} />Farmers
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card-title">🏠 Household Solar Status</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>Distribution across stages</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                  {['#10B981','#F5A623','rgba(255,255,255,0.08)'].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  {hhPct}%
                </text>
                <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-faint)" style={{ fontSize: 9 }}>coverage</text>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {[
                { label: 'Installed', val: installedHH, color: '#10B981' },
                { label: 'Applied',   val: appliedHH,   color: '#F5A623' },
                { label: 'Pending',   val: pendingHH,   color: 'rgba(255,255,255,0.15)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TARGET vs ACHIEVED + QUICK ACTIONS ── */}
      <div className="grid grid-2">

        {/* Bar Chart */}
        <div className="card">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card-title">🎯 Target vs Achieved</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>100% solar progress comparison</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Households', target: hhTarget, achieved: installedHH },
              { name: 'Farmers',    target: fmTarget, achieved: getSafeInt(farmers.installed) },
            ]} barGap={4} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="target" fill="rgba(255,255,255,0.06)" name="Target" radius={[4,4,0,0]} />
              <Bar dataKey="achieved" fill="#F5A623" name="Achieved" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>⚡ Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🏠', label: 'Add Household', sub: 'Register new family', color: 'var(--solar-gold)', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.2)', to: '/households' },
              { icon: '🌾', label: 'Add Farmer', sub: 'Register farmer land', color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', to: '/farmers' },
              { icon: '📝', label: 'Applications', sub: `${pending_applications} pending`, color: 'var(--sky)', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)', to: '/applications' },
              { icon: '🔧', label: 'Maintenance', sub: `${open_complaints} open tickets`, color: '#FB7185', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', to: '/maintenance' },
              { icon: '🗺️', label: 'Village Map', sub: 'View solar coverage', color: '#A78BFA', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', to: '/map' },
              { icon: '📊', label: 'Reports', sub: 'Analytics & exports', color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', to: '/reports' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.to)} style={{
                background: a.bg, border: `1px solid ${a.border}`,
                borderRadius: 10, padding: '12px 14px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: a.color, marginBottom: 2 }}>{a.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>{a.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

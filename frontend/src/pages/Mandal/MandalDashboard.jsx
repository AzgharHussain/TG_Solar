// frontend/src/pages/Mandal/MandalDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardAPI, mandalAPI, applicationsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const COLORS = ['#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: p.color, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString() : p.value}{p.unit || ''}</strong>
        </div>
      ))}
    </div>
  );
};

export default function MandalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [villages, setVillages]     = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('overview');
  const [appStats, setAppStats]     = useState({ submitted: 0, approved: 0, installed: 0, rejected: 0 });

  const fetchAll = () =>
    Promise.all([
      dashboardAPI.mandal({ mandal_id: user?.mandal_id }).then(r => setVillages(r.data || [])),
      mandalAPI.pendingApplications({ mandal_id: user?.mandal_id }).then(r => setPendingApps(r.data || [])),
      applicationsAPI.stats().then(r => setAppStats(r.data || {})).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { fetchAll(); }, [user?.mandal_id]);

  const handleApprove = async (id) => {
    try {
      await applicationsAPI.updateStatus(id, { status: 'approved', comments: 'Approved by MPDO' });
      toast.success('✅ Application approved!');
      mandalAPI.pendingApplications({ mandal_id: user?.mandal_id }).then(r => setPendingApps(r.data || []));
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await applicationsAPI.updateStatus(id, { status: 'rejected', rejection_reason: reason });
      toast.success('Application rejected');
      mandalAPI.pendingApplications({ mandal_id: user?.mandal_id }).then(r => setPendingApps(r.data || []));
    } catch { toast.error('Failed'); }
  };

  const totals = villages.reduce((acc, v) => ({
    hh:        acc.hh        + parseInt(v.total_hh       || 0),
    installed: acc.installed + parseInt(v.hh_installed   || 0),
    farmers:   acc.farmers   + parseInt(v.total_farmers  || 0),
    pumps:     acc.pumps     + parseInt(v.pump_installed  || 0),
  }), { hh: 0, installed: 0, farmers: 0, pumps: 0 });

  const hhCovPct   = totals.hh      > 0 ? ((totals.installed / totals.hh)    * 100).toFixed(1) : 0;
  const pumpCovPct = totals.farmers > 0 ? ((totals.pumps     / totals.farmers)* 100).toFixed(1) : 0;
  const energySaved = (totals.installed * 1.5 * 365 * 6 / 100000).toFixed(0); // ₹ lakhs

  // Chart data
  const coverageData = villages.map(v => ({
    name:    v.name.split(' ')[0],
    rooftop: v.total_hh > 0 ? +((parseInt(v.hh_installed) / v.total_hh) * 100).toFixed(0) : 0,
    pump:    v.total_farmers > 0 ? +((parseInt(v.pump_installed) / v.total_farmers) * 100).toFixed(0) : 0,
  }));

  const absoluteData = villages.map(v => ({
    name:      v.name.split(' ')[0],
    installed: parseInt(v.hh_installed   || 0),
    pending:   parseInt(v.total_hh       || 0) - parseInt(v.hh_installed || 0),
    pumps:     parseInt(v.pump_installed || 0),
  }));

  const pieData = [
    { name: 'Installed',    value: totals.installed },
    { name: 'Not Applied',  value: Math.max(0, totals.hh - totals.installed) },
  ].filter(d => d.value > 0);

  const pumpPieData = [
    { name: 'Pump Installed', value: totals.pumps },
    { name: 'No Pump',        value: Math.max(0, totals.farmers - totals.pumps) },
  ].filter(d => d.value > 0);

  // Village leaderboard (sorted by rooftop coverage %)
  const leaderboard = [...villages].sort((a, b) => {
    const pa = a.total_hh > 0 ? parseInt(a.hh_installed) / a.total_hh : 0;
    const pb = b.total_hh > 0 ? parseInt(b.hh_installed) / b.total_hh : 0;
    return pb - pa;
  });

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🏢 Mandal Dashboard</div>
          <div className="page-subheading">
            {user?.mandal_name} Mandal
            <span className="page-subheading-dot" />
            {villages.length} Villages
            <span className="page-subheading-dot" />
            {pendingApps.length} Pending Approvals
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/applications')}>📝 All Applications</button>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.1)' }}>🏘️</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--sky)' }}>{villages.length}</div>
          <div className="stat-label">Villages</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{totals.hh.toLocaleString()} total households</div>
        </div>

        <div className="stat-card gold">
          <div className="stat-icon gold">🏠</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--solar-gold)' }}>{totals.installed.toLocaleString()}</div>
          <div className="stat-label">Rooftop Installed</div>
          <div className="progress-bar-track" style={{ marginTop: 8 }}>
            <div className="progress-bar-fill gold" style={{ width: `${hhCovPct}%` }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--solar-gold)', marginTop: 4, fontWeight: 700 }}>{hhCovPct}% coverage</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon green">💧</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald-light)' }}>{totals.pumps.toLocaleString()}</div>
          <div className="stat-label">Pumps Installed</div>
          <div className="progress-bar-track" style={{ marginTop: 8 }}>
            <div className="progress-bar-fill green" style={{ width: `${pumpCovPct}%` }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--emerald-light)', marginTop: 4, fontWeight: 700 }}>{pumpCovPct}% of {totals.farmers} farmers</div>
        </div>

        <div className="stat-card" style={{ borderBottom: '3px solid #EF4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>⏳</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444' }}>{pendingApps.length}</div>
          <div className="stat-label">Pending Approvals</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem', padding: '4px 12px' }}
              onClick={() => setActiveTab('approvals')}>Review Now →</button>
          </div>
        </div>
      </div>

      {/* ── 2nd row KPIs ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { icon: '⚡', label: 'Est. Energy Saved',  value: `₹${energySaved}L/yr`,  color: '#A78BFA', bg: 'rgba(139,92,246,0.1)' },
          { icon: '🏅', label: 'Top Village',         value: leaderboard[0]?.name?.split(' ')[0] || '—', color: 'var(--solar-gold)', bg: 'rgba(245,166,35,0.08)' },
          { icon: '📈', label: 'Rooftop Coverage',    value: `${hhCovPct}%`,   color: 'var(--sky)',          bg: 'rgba(56,189,248,0.08)' },
          { icon: '🌾', label: 'Pump Coverage',        value: `${pumpCovPct}%`, color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.08)' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-display)' }}>{k.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tab-list">
        {[
          ['overview',  '📊 Overview'],
          ['villages',  `🏘️ Villages (${villages.length})`],
          ['approvals', `⏳ Pending Approvals (${pendingApps.length})`],
        ].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)' }}>
            {/* Bar chart: coverage % by village */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Village-wise Coverage %</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={coverageData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rooftop" fill="var(--solar-gold)" name="Rooftop %" radius={[4,4,0,0]} />
                  <Bar dataKey="pump"    fill="var(--sky)"        name="Pump %"    radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart: absolute numbers */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Solar Installations by Village</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={absoluteData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="installed" fill="var(--emerald-light)" name="Installed"     radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="pending"   fill="rgba(239,68,68,0.4)" name="Not Installed" radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie charts */}
          <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Rooftop Solar Status</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon">🏠</div>
                  <div className="empty-state-title">No data yet</div>
                </div>
              )}
            </div>

            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Solar Pump Status</div>
              {pumpPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pumpPieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {pumpPieData.map((_, i) => <Cell key={i} fill={[COLORS[2], COLORS[4]][i % 2]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon">💧</div>
                  <div className="empty-state-title">No data yet</div>
                </div>
              )}
            </div>
          </div>

          {/* Village leaderboard */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏆 Village Leaderboard (by Rooftop Coverage)</div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏘️</div>
                <div className="empty-state-title">No villages found</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Village</th><th>Households</th>
                      <th>Rooftop Installed</th><th>Rooftop %</th>
                      <th>Farmers</th><th>Pumps</th><th>Pump %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((v, idx) => {
                      const hhPct = parseInt(v.total_hh) > 0 ? ((parseInt(v.hh_installed)/parseInt(v.total_hh))*100).toFixed(0) : 0;
                      const fmPct = parseInt(v.total_farmers) > 0 ? ((parseInt(v.pump_installed)/parseInt(v.total_farmers))*100).toFixed(0) : 0;
                      const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}`;
                      return (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 800, fontSize: '1rem' }}>{medalEmoji}</td>
                          <td style={{ fontWeight: 600 }}>{v.name}</td>
                          <td>{parseInt(v.total_hh || 0).toLocaleString()}</td>
                          <td style={{ color: 'var(--emerald-light)' }}>{parseInt(v.hh_installed || 0).toLocaleString()}</td>
                          <td>
                            <span style={{ color: hhPct >= 80 ? 'var(--emerald-light)' : hhPct >= 50 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>
                              {hhPct}%
                            </span>
                          </td>
                          <td>{parseInt(v.total_farmers || 0).toLocaleString()}</td>
                          <td style={{ color: 'var(--sky)' }}>{parseInt(v.pump_installed || 0).toLocaleString()}</td>
                          <td>
                            <span style={{ color: fmPct >= 80 ? 'var(--emerald-light)' : fmPct >= 50 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>
                              {fmPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Villages Tab ── */}
      {activeTab === 'villages' && (
        <div>
          {villages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏘️</div>
              <div className="empty-state-title">No villages found</div>
              <div className="empty-state-desc">No village data is linked to this mandal yet.</div>
            </div>
          ) : (
            <div className="grid grid-2">
              {villages.map(v => {
                const hhPct = parseInt(v.total_hh) > 0 ? ((parseInt(v.hh_installed)/parseInt(v.total_hh))*100).toFixed(0) : 0;
                const fmPct = parseInt(v.total_farmers) > 0 ? ((parseInt(v.pump_installed)/parseInt(v.total_farmers))*100).toFixed(0) : 0;
                return (
                  <div key={v.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{v.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{v.gram_panchayat || '—'}</div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: hhPct >= 80 ? 'rgba(16,185,129,0.15)' : hhPct >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: hhPct >= 80 ? 'var(--emerald-light)' : hhPct >= 50 ? 'var(--solar-gold)' : '#EF4444',
                          fontSize: '0.7rem', fontWeight: 700,
                        }}
                      >
                        {hhPct}% covered
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                      {[
                        { label: 'Households',   value: parseInt(v.total_hh   || 0).toLocaleString(), color: 'var(--text-primary)' },
                        { label: 'Solar Instd.', value: parseInt(v.hh_installed || 0).toLocaleString(), color: 'var(--solar-gold)' },
                        { label: 'Farmers',      value: parseInt(v.total_farmers || 0).toLocaleString(), color: 'var(--text-primary)' },
                        { label: 'Pumps Instd.', value: parseInt(v.pump_installed || 0).toLocaleString(), color: 'var(--sky)' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Rooftop progress */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Rooftop Coverage</span><span style={{ fontWeight: 700, color: 'var(--solar-gold)' }}>{hhPct}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill gold" style={{ width: `${hhPct}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, marginTop: 8 }}>
                        <span>Pump Coverage</span><span style={{ fontWeight: 700, color: 'var(--sky)' }}>{fmPct}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${fmPct}%`, background: 'var(--sky)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
          )}
        </div>
      )}

      {/* ── Pending Approvals Tab ── */}
      {activeTab === 'approvals' && (
        <div>
          {pendingApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-desc">No pending applications require your approval at this time.</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {pendingApps.length} application{pendingApps.length !== 1 ? 's' : ''} awaiting mandal approval
                </span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Applicant</th><th>Village</th>
                      <th>Type</th><th>Submitted</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApps.map(app => (
                      <tr key={app.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{app.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.applicant_name || app.name || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{app.mobile || ''}</div>
                        </td>
                        <td>{app.village_name || '—'}</td>
                        <td>
                          <span className={`badge ${app.type === 'rooftop' ? 'badge-applied' : 'badge-progress'}`} style={{ fontSize: '0.7rem' }}>
                            {app.type === 'rooftop' ? '🏠 Rooftop' : '💧 Pump'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-success btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 14px' }}
                              onClick={() => handleApprove(app.id)}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 14px' }}
                              onClick={() => handleReject(app.id)}
                            >
                              ✕ Reject
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                              onClick={() => navigate(`/applications/${app.id}`)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
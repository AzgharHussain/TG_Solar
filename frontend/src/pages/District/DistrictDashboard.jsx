// frontend/src/pages/District/DistrictDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, districtAPI, stateAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 5, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: p.color, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const EMPTY_VENDOR = { name: '', registration_no: '', contact_person: '', mobile: '', email: '', service_areas: '' };

export default function DistrictDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mandals, setMandals]           = useState([]);
  const [mandalDetail, setMandalDetail] = useState([]);
  const [vendors, setVendors]           = useState([]);
  const [schemes, setSchemes]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('overview');
  const [showModal, setShowModal]       = useState(false);
  const [vendorForm, setVendorForm]     = useState(EMPTY_VENDOR);
  const [saving, setSaving]             = useState(false);
  const [searchVendor, setSearchVendor] = useState('');

  const reload = () =>
    Promise.all([
      dashboardAPI.district({ district_id: user?.district_id }).then(r => setMandals(r.data || [])),
      dashboardAPI.districtSummary({ district_id: user?.district_id }).then(r => setMandalDetail(r.data || [])).catch(() => {}),
      stateAPI.vendors().then(r => setVendors(r.data || [])),
      districtAPI.schemes().then(r => setSchemes(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { reload(); }, [user?.district_id]);

  const totals = mandals.reduce((acc, m) => ({
    villages:  acc.villages  + parseInt(m.village_count  || 0),
    hh:        acc.hh        + parseInt(m.total_hh       || 0),
    installed: acc.installed  + parseInt(m.hh_installed  || 0),
    farmers:   acc.farmers   + parseInt(m.total_farmers  || 0),
    pumps:     acc.pumps     + parseInt(m.pump_installed  || 0),
  }), { villages: 0, hh: 0, installed: 0, farmers: 0, pumps: 0 });

  const hhCovPct   = totals.hh      > 0 ? ((totals.installed / totals.hh)    * 100).toFixed(1) : 0;
  const pumpCovPct = totals.farmers > 0 ? ((totals.pumps     / totals.farmers)* 100).toFixed(1) : 0;
  const energySaved = (totals.installed * 2 * 1.2 / 1000).toFixed(2); // GWh/yr
  const totalPending = mandalDetail.reduce((s, m) => s + parseInt(m.pending_apps || 0), 0);

  const leaderboard = [...mandals].sort((a, b) => {
    const pa = parseInt(a.total_hh) > 0 ? parseInt(a.hh_installed) / parseInt(a.total_hh) : 0;
    const pb = parseInt(b.total_hh) > 0 ? parseInt(b.hh_installed) / parseInt(b.total_hh) : 0;
    return pb - pa;
  });

  const coveragePctData = mandals.map(m => ({
    name:    m.name.split(' ')[0],
    rooftop: parseInt(m.total_hh) > 0 ? +((parseInt(m.hh_installed)/parseInt(m.total_hh))*100).toFixed(0) : 0,
    pump:    parseInt(m.total_farmers) > 0 ? +((parseInt(m.pump_installed)/parseInt(m.total_farmers))*100).toFixed(0) : 0,
  }));

  const absoluteData = mandals.map(m => ({
    name:      m.name.split(' ')[0],
    installed: parseInt(m.hh_installed   || 0),
    pumps:     parseInt(m.pump_installed || 0),
    villages:  parseInt(m.village_count  || 0),
  }));

  const pieDataHH = [
    { name: 'Installed',    value: totals.installed },
    { name: 'Not Covered',  value: Math.max(0, totals.hh - totals.installed) },
  ].filter(d => d.value > 0);

  const radarData = mandals.slice(0, 6).map(m => ({
    mandal: m.name.split(' ')[0],
    rooftop: parseInt(m.total_hh) > 0 ? +((parseInt(m.hh_installed)/parseInt(m.total_hh))*100).toFixed(0) : 0,
    pump:    parseInt(m.total_farmers) > 0 ? +((parseInt(m.pump_installed)/parseInt(m.total_farmers))*100).toFixed(0) : 0,
  }));

  const handleAddVendor = async () => {
    if (!vendorForm.name || !vendorForm.registration_no) {
      toast.error('Company name and Registration No. are required'); return;
    }
    setSaving(true);
    try {
      await stateAPI.createVendor(vendorForm);
      toast.success('✅ Vendor added!');
      setShowModal(false); setVendorForm(EMPTY_VENDOR);
      stateAPI.vendors().then(r => setVendors(r.data || []));
    } catch (err) { toast.error(err?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const filteredVendors = vendors.filter(v =>
    !searchVendor ||
    v.name?.toLowerCase().includes(searchVendor.toLowerCase()) ||
    (v.service_areas||'').toLowerCase().includes(searchVendor.toLowerCase())
  );

  const ratingColor = r => r >= 4.5 ? 'var(--emerald-light)' : r >= 4.0 ? 'var(--solar-gold)' : r >= 3.5 ? '#FB923C' : '#EF4444';

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🏛️ District Dashboard</div>
          <div className="page-subheading">
            {user?.district_name} District
            <span className="page-subheading-dot" />
            {mandals.length} Mandals
            <span className="page-subheading-dot" />
            {totals.villages} Villages
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/applications')}>📝 Applications</button>
        </div>
      </div>

      {/* ── KPI Cards Row 1 ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.1)' }}>🏘️</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--sky)' }}>{totals.villages.toLocaleString()}</div>
          <div className="stat-label">Total Villages</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{mandals.length} mandals · {totals.hh.toLocaleString()} HH</div>
        </div>

        <div className="stat-card gold">
          <div className="stat-icon gold">🏠</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--solar-gold)' }}>{totals.installed.toLocaleString()}</div>
          <div className="stat-label">Rooftop Solar Installed</div>
          <div className="progress-bar-track" style={{ marginTop: 8 }}>
            <div className="progress-bar-fill gold" style={{ width: `${hhCovPct}%` }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--solar-gold)', marginTop: 4, fontWeight: 700 }}>{hhCovPct}% of {totals.hh.toLocaleString()} households</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon green">💧</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald-light)' }}>{totals.pumps.toLocaleString()}</div>
          <div className="stat-label">Solar Pumps Installed</div>
          <div className="progress-bar-track" style={{ marginTop: 8 }}>
            <div className="progress-bar-fill green" style={{ width: `${pumpCovPct}%` }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--emerald-light)', marginTop: 4, fontWeight: 700 }}>{pumpCovPct}% of {totals.farmers.toLocaleString()} farmers</div>
        </div>

        <div className="stat-card" style={{ borderBottom: totalPending > 0 ? '3px solid #EF4444' : '3px solid var(--emerald-light)' }}>
          <div className="stat-icon" style={{ background: totalPending > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>⏳</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: totalPending > 0 ? '#EF4444' : 'var(--emerald-light)' }}>{totalPending}</div>
          <div className="stat-label">Pending Approvals</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Across all mandals</div>
        </div>
      </div>

      {/* ── KPI Cards Row 2 ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { icon: '⚡', label: 'Est. Energy Generated', value: `${energySaved} GWh/yr`, color: '#A78BFA', bg: 'rgba(139,92,246,0.1)' },
          { icon: '🏅', label: 'Top Mandal', value: leaderboard[0]?.name?.split(' ')[0] || '—', color: 'var(--solar-gold)', bg: 'rgba(245,166,35,0.08)' },
          { icon: '🌿', label: 'CO₂ Avoided', value: `${(totals.installed * 2 * 1.2).toLocaleString()} T/yr`, color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.08)' },
          { icon: '🏭', label: 'Active Vendors', value: vendors.filter(v => !v.is_blacklisted).length, color: 'var(--sky)', bg: 'rgba(56,189,248,0.08)' },
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
          ['overview',  '📊 Mandal Overview'],
          ['charts',    '📈 Analytics'],
          ['vendors',   `🏭 Vendors (${vendors.length})`],
          ['schemes',   `📋 Schemes (${schemes.length})`],
        ].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Leaderboard Table */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏆 Mandal Leaderboard — Solar Coverage Ranking</div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Mandal</th><th>Villages</th><th>Households</th>
                    <th>Rooftop ✅</th><th>Coverage %</th>
                    <th>Farmers</th><th>Pumps ✅</th><th>Pump %</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((m, idx) => {
                    const hhPct = parseInt(m.total_hh) > 0 ? ((parseInt(m.hh_installed)/parseInt(m.total_hh))*100).toFixed(1) : 0;
                    const fmPct = parseInt(m.total_farmers) > 0 ? ((parseInt(m.pump_installed)/parseInt(m.total_farmers))*100).toFixed(1) : 0;
                    const detail = mandalDetail.find(d => d.id === m.id);
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}`;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 800, fontSize: '1rem' }}>{medal}</td>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td>{parseInt(m.village_count || 0)}</td>
                        <td>{parseInt(m.total_hh || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>{parseInt(m.hh_installed || 0).toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar-track" style={{ width: 60 }}>
                              <div className="progress-bar-fill gold" style={{ width: `${hhPct}%` }} />
                            </div>
                            <span style={{ color: hhPct >= 70 ? 'var(--emerald-light)' : hhPct >= 40 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>{hhPct}%</span>
                          </div>
                        </td>
                        <td>{parseInt(m.total_farmers || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--sky)', fontWeight: 700 }}>{parseInt(m.pump_installed || 0).toLocaleString()}</td>
                        <td><span style={{ color: fmPct >= 70 ? 'var(--emerald-light)' : fmPct >= 40 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>{fmPct}%</span></td>
                        <td>
                          {detail?.pending_apps > 0 ? (
                            <span className="badge badge-applied" style={{ fontSize: '0.68rem' }}>{detail.pending_apps} pending</span>
                          ) : (
                            <span className="badge badge-installed" style={{ fontSize: '0.68rem' }}>✅ Clear</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart: Absolute */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📊 Mandal-wise Solar Installations</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={absoluteData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="installed" fill="var(--solar-gold)" name="Rooftop Installed" radius={[4,4,0,0]} />
                <Bar dataKey="pumps"     fill="var(--sky)"        name="Pumps Installed"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'charts' && (
        <div>
          <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)' }}>
            {/* Coverage % Bar */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📈 Coverage % by Mandal</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={coveragePctData}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rooftop" fill="var(--solar-gold)" name="Rooftop %" radius={[4,4,0,0]} />
                  <Bar dataKey="pump"    fill="var(--emerald-light)" name="Pump %" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>🥧 District Rooftop Status</div>
              {pieDataHH.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieDataHH} dataKey="value" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {pieDataHH.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[4]][i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><div className="empty-state-icon">🏠</div><div className="empty-state-title">No data</div></div>}
            </div>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🕸️ Coverage Radar — Mandal Comparison</div>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis dataKey="mandal" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Radar name="Rooftop %" dataKey="rooftop" stroke="var(--solar-gold)" fill="var(--solar-gold)" fillOpacity={0.2} />
                  <Radar name="Pump %"    dataKey="pump"    stroke="var(--sky)"        fill="var(--sky)"        fillOpacity={0.2} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Vendors Tab ── */}
      {activeTab === 'vendors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', gap: 12, flexWrap: 'wrap' }}>
            <input className="form-input" placeholder="🔍 Search vendor or service area..." value={searchVendor}
              onChange={e => setSearchVendor(e.target.value)} style={{ maxWidth: 320, marginBottom: 0 }} />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Vendor</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Vendors', value: vendors.length, color: 'var(--sky)' },
              { label: 'Active', value: vendors.filter(v => !v.is_blacklisted).length, color: 'var(--emerald-light)' },
              { label: 'Blacklisted', value: vendors.filter(v => v.is_blacklisted).length, color: '#EF4444' },
              { label: 'Total Installs', value: vendors.reduce((s, v) => s + (v.total_installations||0), 0).toLocaleString(), color: 'var(--solar-gold)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '8px 16px', minWidth: 110 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {filteredVendors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏭</div>
              <div className="empty-state-title">No vendors found</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>➕ Add Vendor</button>
            </div>
          ) : (
            <div className="grid grid-2">
              {filteredVendors.map(v => (
                <div key={v.id} className="card" style={{ borderLeft: `3px solid ${v.is_blacklisted ? '#EF4444' : 'var(--emerald-light)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>{v.name}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>📋 {v.registration_no}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: ratingColor(v.rating) }}>⭐ {v.rating}</div>
                      <span className={`badge ${v.is_blacklisted ? 'badge-rejected' : 'badge-installed'}`} style={{ fontSize: '0.62rem' }}>
                        {v.is_blacklisted ? '🚫 Blacklisted' : '✅ Active'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <div>👤 {v.contact_person}</div>
                    <div>📞 {v.mobile}</div>
                    {v.email && <div style={{ gridColumn: '1/-1' }}>✉️ {v.email}</div>}
                    <div style={{ gridColumn: '1/-1' }}>📍 {v.service_areas}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--emerald-light)' }}>{(v.total_installations||0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>Installations</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: v.complaint_count > 15 ? '#EF4444' : 'var(--solar-gold)' }}>{v.complaint_count || 0}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>Complaints</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Schemes Tab ── */}
      {activeTab === 'schemes' && (
        <div className="grid grid-2">
          {schemes.map(s => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <span className={`badge ${s.type === 'rooftop' ? 'badge-applied' : 'badge-progress'}`}>{s.type}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Code: <code style={{ color: 'var(--solar-gold)' }}>{s.code}</code></div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                  <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Central Subsidy</div><div style={{ fontWeight: 700, color: 'var(--emerald-light)' }}>{s.central_subsidy_pct}%</div></div>
                  <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>State Subsidy</div><div style={{ fontWeight: 700, color: 'var(--sky)' }}>{s.state_subsidy_pct}%</div></div>
                  <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beneficiary</div><div style={{ fontWeight: 700, color: 'var(--solar-gold)' }}>{100 - s.central_subsidy_pct - s.state_subsidy_pct}%</div></div>
                </div>
                <div style={{ marginTop: 8 }}>{s.eligibility_criteria}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏭 Add New Solar Vendor</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Company Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. TS Solar Power Ltd" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration No. <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. TSSPDCL-VND-016" value={vendorForm.registration_no} onChange={e => setVendorForm(f => ({ ...f, registration_no: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input className="form-input" placeholder="Name" value={vendorForm.contact_person} onChange={e => setVendorForm(f => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-input" placeholder="10-digit mobile" value={vendorForm.mobile} onChange={e => setVendorForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" placeholder="vendor@email.com" value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Service Areas (Districts)</label>
                <input className="form-input" placeholder="e.g. Siddipet, Medak, Hyderabad" value={vendorForm.service_areas} onChange={e => setVendorForm(f => ({ ...f, service_areas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddVendor} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Add Vendor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// frontend/src/pages/State/StateDashboard.jsx
import { useEffect, useState } from 'react';
import { dashboardAPI, stateAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316','#84CC16'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 5, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: p.color, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function StateDashboard() {
  const { user } = useAuthStore();
  const [districts, setDistricts] = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [schemes, setSchemes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', registration_no: '', contact_person: '', mobile: '', email: '', service_areas: '' });
  const [schemeForm, setSchemeForm] = useState({ name: '', code: '', type: 'rooftop', central_subsidy_pct: 30, state_subsidy_pct: 30, eligibility_criteria: '' });

  const reload = () =>
    Promise.all([
      dashboardAPI.state().then(r => setDistricts(Array.isArray(r.data) ? r.data : (r.data?.districts || []))),
      stateAPI.vendors().then(r => setVendors(r.data || [])),
      stateAPI.schemes().then(r => setSchemes(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const totals = districts.reduce((acc, d) => ({
    mandals:   acc.mandals   + parseInt(d.mandal_count  || 0),
    villages:  acc.villages  + parseInt(d.village_count || 0),
    hh:        acc.hh        + parseInt(d.total_hh      || 0),
    installed: acc.installed + parseInt(d.hh_installed  || 0),
    farmers:   acc.farmers   + parseInt(d.total_farmers || 0),
    pumps:     acc.pumps     + parseInt(d.pump_installed || 0),
  }), { mandals: 0, villages: 0, hh: 0, installed: 0, farmers: 0, pumps: 0 });

  const hhCovPct   = totals.hh      > 0 ? ((totals.installed / totals.hh)    * 100).toFixed(1) : 0;
  const pumpCovPct = totals.farmers > 0 ? ((totals.pumps     / totals.farmers)* 100).toFixed(1) : 0;
  const co2Saved   = (totals.installed * 2 * 1.2 / 1000000).toFixed(2); // million tons/yr
  const energyGWh  = (totals.installed * 2 * 1.8 / 1000).toFixed(1);    // GWh/yr
  const totalSubsidy = (totals.installed * 48000 / 10000000).toFixed(0); // ₹ crore (avg ₹48k/HH)

  const leaderboard = [...districts].sort((a, b) => {
    const pa = parseInt(a.total_hh) > 0 ? parseInt(a.hh_installed) / parseInt(a.total_hh) : 0;
    const pb = parseInt(b.total_hh) > 0 ? parseInt(b.hh_installed) / parseInt(b.total_hh) : 0;
    return pb - pa;
  });

  const barData = districts.map(d => ({
    name:      d.name.replace(' District','').trim().split(' ')[0],
    rooftop:   parseInt(d.hh_installed   || 0),
    pump:      parseInt(d.pump_installed || 0),
  }));

  const coveragePctData = districts.map(d => ({
    name:    d.name.replace(' District','').trim().split(' ')[0],
    rooftop: parseInt(d.total_hh) > 0 ? +((parseInt(d.hh_installed)/parseInt(d.total_hh))*100).toFixed(0) : 0,
    pump:    parseInt(d.total_farmers) > 0 ? +((parseInt(d.pump_installed)/parseInt(d.total_farmers))*100).toFixed(0) : 0,
  }));

  const pieHH = [
    { name: 'Solar Installed', value: totals.installed },
    { name: 'Not Covered',     value: Math.max(0, totals.hh - totals.installed) },
  ].filter(d => d.value > 0);

  const piePump = [
    { name: 'Pump Installed', value: totals.pumps },
    { name: 'No Pump',        value: Math.max(0, totals.farmers - totals.pumps) },
  ].filter(d => d.value > 0);

  const radarData = districts.slice(0, 7).map(d => ({
    district: d.name.split(' ')[0],
    rooftop: parseInt(d.total_hh) > 0 ? +((parseInt(d.hh_installed)/parseInt(d.total_hh))*100).toFixed(0) : 0,
    pump:    parseInt(d.total_farmers) > 0 ? +((parseInt(d.pump_installed)/parseInt(d.total_farmers))*100).toFixed(0) : 0,
  }));

  const handleAddVendor = async () => {
    try { await stateAPI.createVendor(vendorForm); toast.success('✅ Vendor added!'); setShowVendorModal(false); stateAPI.vendors().then(r => setVendors(r.data || [])); }
    catch { toast.error('Failed'); }
  };
  const handleAddScheme = async () => {
    try { await stateAPI.createScheme(schemeForm); toast.success('✅ Scheme added!'); setShowSchemeModal(false); stateAPI.schemes().then(r => setSchemes(r.data || [])); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🏛️ State Dashboard — Telangana</div>
          <div className="page-subheading">
            {districts.length} Districts
            <span className="page-subheading-dot" />
            {totals.mandals} Mandals
            <span className="page-subheading-dot" />
            {totals.villages} Villages
          </div>
        </div>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
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

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.1)' }}>🏘️</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--sky)' }}>{totals.villages.toLocaleString()}</div>
          <div className="stat-label">Villages Covered</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Across {districts.length} districts</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>💰</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#A78BFA' }}>₹{totalSubsidy}Cr</div>
          <div className="stat-label">Total Subsidy Disbursed</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Central + State (TS) combined</div>
        </div>
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { icon: '⚡', label: 'Energy Generated',   value: `${energyGWh} GWh/yr`,                        color: '#A78BFA', bg: 'rgba(139,92,246,0.1)' },
          { icon: '🌿', label: 'CO₂ Avoided',        value: `${co2Saved}M Tons/yr`,                       color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.08)' },
          { icon: '🏅', label: 'Top District',        value: leaderboard[0]?.name?.split(' ')[0] || '—',   color: 'var(--solar-gold)', bg: 'rgba(245,166,35,0.08)' },
          { icon: '🏭', label: 'Registered Vendors',  value: vendors.length,                               color: 'var(--sky)', bg: 'rgba(56,189,248,0.08)' },
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
          ['overview',  '📊 District Overview'],
          ['analytics', '📈 Analytics'],
          ['vendors',   `🏭 Vendors (${vendors.length})`],
          ['schemes',   `📋 Schemes (${schemes.length})`],
        ].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Bar Chart */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📊 District-wise Solar Installations</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rooftop" fill="var(--solar-gold)"    name="Rooftop Installed" radius={[4,4,0,0]} />
                <Bar dataKey="pump"    fill="var(--emerald-light)" name="Pumps Installed"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* District Table */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏆 District Leaderboard</div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>District</th><th>Mandals</th><th>Villages</th>
                    <th>Households</th><th>Solar ✅</th><th>Coverage %</th>
                    <th>Farmers</th><th>Pumps ✅</th><th>Pump %</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((d, idx) => {
                    const pct  = parseInt(d.total_hh) > 0 ? ((parseInt(d.hh_installed)/parseInt(d.total_hh))*100).toFixed(1) : 0;
                    const fpct = parseInt(d.total_farmers) > 0 ? ((parseInt(d.pump_installed)/parseInt(d.total_farmers))*100).toFixed(1) : 0;
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}`;
                    return (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 800, fontSize: '1rem' }}>{medal}</td>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td>{d.mandal_count}</td>
                        <td>{d.village_count}</td>
                        <td>{parseInt(d.total_hh || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>{parseInt(d.hh_installed || 0).toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar-track" style={{ width: 60 }}>
                              <div className="progress-bar-fill gold" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ color: parseFloat(pct) >= 70 ? 'var(--emerald-light)' : parseFloat(pct) >= 40 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>{pct}%</span>
                          </div>
                        </td>
                        <td>{parseInt(d.total_farmers || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--sky)', fontWeight: 700 }}>{parseInt(d.pump_installed || 0).toLocaleString()}</td>
                        <td><span style={{ color: parseFloat(fpct) >= 70 ? 'var(--emerald-light)' : parseFloat(fpct) >= 40 ? 'var(--solar-gold)' : '#EF4444', fontWeight: 700 }}>{fpct}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && (
        <div>
          <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)' }}>
            {/* Coverage % Bar */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📈 Coverage % by District</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={coveragePctData}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rooftop" fill="var(--solar-gold)"    name="Rooftop %" radius={[4,4,0,0]} />
                  <Bar dataKey="pump"    fill="var(--emerald-light)" name="Pump %"    radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Charts */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>🥧 State-wide Solar Status</div>
              <div className="grid grid-2">
                {pieHH.length > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Rooftop</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieHH} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                          label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {pieHH.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[4]][i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {piePump.length > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Pumps</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={piePump} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                          label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {piePump.map((_, i) => <Cell key={i} fill={[COLORS[0], COLORS[4]][i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🕸️ District Coverage Radar</div>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis dataKey="district" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Radar name="Rooftop %" dataKey="rooftop" stroke="var(--solar-gold)"    fill="var(--solar-gold)"    fillOpacity={0.2} />
                  <Radar name="Pump %"    dataKey="pump"    stroke="var(--emerald-light)" fill="var(--emerald-light)" fillOpacity={0.2} />
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => setShowVendorModal(true)}>➕ Add Vendor</button>
          </div>
          <div className="grid grid-2">
            {vendors.map(v => (
              <div key={v.id} className="card" style={{ borderLeft: `3px solid ${v.is_blacklisted ? '#EF4444' : 'var(--emerald-light)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{v.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📋 {v.registration_no}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: v.rating >= 4.5 ? 'var(--emerald-light)' : v.rating >= 4.0 ? 'var(--solar-gold)' : '#EF4444' }}>⭐ {v.rating}</div>
                    <span className={`badge ${v.is_blacklisted ? 'badge-rejected' : 'badge-installed'}`} style={{ fontSize: '0.62rem' }}>{v.is_blacklisted ? 'Blacklisted' : 'Active'}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>👤 {v.contact_person} • 📞 {v.mobile}</div>
                  <div>📍 {v.service_areas}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                    <span style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>✅ {v.total_installations} installs</span>
                    {v.complaint_count > 0 && <span style={{ color: '#EF4444' }}>⚠️ {v.complaint_count} complaints</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Schemes Tab ── */}
      {activeTab === 'schemes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => setShowSchemeModal(true)}>➕ Add Scheme</button>
          </div>
          <div className="grid grid-2">
            {schemes.map(s => (
              <div key={s.id} className="card" style={{ borderLeft: `3px solid ${s.type === 'rooftop' ? 'var(--solar-gold)' : 'var(--sky)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <span className={`badge ${s.type === 'rooftop' ? 'badge-applied' : 'badge-progress'}`}>{s.type === 'rooftop' ? '🏠 Rooftop' : '💧 Pump'}</span>
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Code: <code style={{ color: 'var(--solar-gold)' }}>{s.code}</code></div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Central Subsidy</div><div style={{ fontWeight: 700, color: 'var(--emerald-light)', fontSize: '1.1rem' }}>{s.central_subsidy_pct}%</div></div>
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>State Subsidy (TS)</div><div style={{ fontWeight: 700, color: 'var(--sky)', fontSize: '1.1rem' }}>{s.state_subsidy_pct}%</div></div>
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beneficiary</div><div style={{ fontWeight: 700, color: 'var(--solar-gold)', fontSize: '1.1rem' }}>{100 - s.central_subsidy_pct - s.state_subsidy_pct}%</div></div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.eligibility_criteria}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showVendorModal && (
        <div className="modal-overlay" onClick={() => setShowVendorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏭 Add Solar Vendor</div>
              <button className="modal-close" onClick={() => setShowVendorModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group"><label className="form-label">Company Name</label><input className="form-input" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Registration No.</label><input className="form-input" value={vendorForm.registration_no} onChange={e => setVendorForm(f => ({ ...f, registration_no: e.target.value }))} /></div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={vendorForm.contact_person} onChange={e => setVendorForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Mobile</label><input className="form-input" value={vendorForm.mobile} onChange={e => setVendorForm(f => ({ ...f, mobile: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Service Areas</label><input className="form-input" placeholder="e.g. Siddipet, Medak, Hyderabad" value={vendorForm.service_areas} onChange={e => setVendorForm(f => ({ ...f, service_areas: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowVendorModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddVendor}>💾 Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Scheme Modal */}
      {showSchemeModal && (
        <div className="modal-overlay" onClick={() => setShowSchemeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 Add New Scheme</div>
              <button className="modal-close" onClick={() => setShowSchemeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group"><label className="form-label">Scheme Name</label><input className="form-input" value={schemeForm.name} onChange={e => setSchemeForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={schemeForm.code} onChange={e => setSchemeForm(f => ({ ...f, code: e.target.value }))} /></div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={schemeForm.type} onChange={e => setSchemeForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="rooftop">Rooftop Solar</option>
                    <option value="pump">Solar Pump</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Central Subsidy %</label><input type="number" className="form-input" value={schemeForm.central_subsidy_pct} onChange={e => setSchemeForm(f => ({ ...f, central_subsidy_pct: e.target.value }))} /></div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group"><label className="form-label">State Subsidy %</label><input type="number" className="form-input" value={schemeForm.state_subsidy_pct} onChange={e => setSchemeForm(f => ({ ...f, state_subsidy_pct: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Eligibility</label><input className="form-input" value={schemeForm.eligibility_criteria} onChange={e => setSchemeForm(f => ({ ...f, eligibility_criteria: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSchemeModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddScheme}>💾 Add Scheme</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

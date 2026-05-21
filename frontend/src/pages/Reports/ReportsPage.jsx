// frontend/src/pages/Reports/ReportsPage.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [coverage, setCoverage] = useState(null);
  const [activeTab, setActiveTab] = useState('coverage');
  const [qrData, setQrData] = useState(null);
  const [qrType, setQrType] = useState('households');
  const [qrId, setQrId] = useState('');

  useEffect(() => {
    reportsAPI.coverage({ village_id: user?.village_id }).then(r => setCoverage(r.data)).catch(() => {});
  }, [user?.village_id]);

  const downloadExcel = (type) => {
    const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token;
    const url = type === 'households'
      ? reportsAPI.householdExcel({ village_id: user?.village_id })
      : reportsAPI.farmerExcel({ village_id: user?.village_id });
    const a = document.createElement('a');
    const headers = new Headers({ 'Authorization': `Bearer ${token}` });
    fetch(url, { headers }).then(r => r.blob()).then(blob => {
      a.href = URL.createObjectURL(blob);
      a.download = `${type}_register.xlsx`;
      a.click();
    });
    toast.success('Downloading Excel...');
  };

  const downloadTemplate = (type) => {
    const url = type === 'households' ? reportsAPI.templateHouseholds() : reportsAPI.templateFarmers();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.xlsx`;
    a.click();
  };

  const generateQR = async () => {
    if (!qrId) return toast.error('Enter an ID');
    try {
      const res = await reportsAPI.qr(qrType, qrId);
      setQrData(res.data);
    } catch { toast.error('Failed'); }
  };

  const pieColors = ['#40C584', '#F5A623', '#EF4444'];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-heading">📈 Reports & Analytics</div>
      </div>

      <div className="tab-list">
        {[['coverage', '📊 Coverage'], ['export', '📥 Export'], ['qr', '🔲 QR Codes'], ['action-plan', '📋 Action Plan']].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* Coverage Tab */}
      {activeTab === 'coverage' && coverage && (
        <div>
          {/* Village Score */}
          <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="stat-card gold">
              <div className="stat-icon gold">🏠</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--solar-gold)' }}>{coverage.households.percentage}%</div>
              <div className="stat-label">Rooftop Coverage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coverage.households.installed} / {coverage.households.target} households</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">💧</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald-light)' }}>{coverage.farmers.percentage}%</div>
              <div className="stat-label">Pump Coverage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coverage.farmers.installed} / {coverage.farmers.target} farmers</div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '1.8rem' }}>🌿</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--emerald-light)' }}>{coverage.co2_saved}</div>
              <div className="stat-label">Tons CO₂ Saved</div>
            </div>
            <div className="stat-card purple">
              <div style={{ fontSize: '1.8rem' }}>🏆</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#A78BFA' }}>{coverage.village_score}</div>
              <div className="stat-label">Village Score / 100</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏠 Household Solar Distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: 'Installed', value: parseInt(coverage.households.installed) },
                    { name: 'Remaining', value: Math.max(0, coverage.households.target - parseInt(coverage.households.installed)) },
                  ]} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                    {['#40C584', '#F5A623'].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-800)', border: '1px solid var(--border-medium)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📊 Target vs Achieved</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'Households', target: coverage.households.target, achieved: parseInt(coverage.households.installed) },
                  { name: 'Farmers', target: coverage.farmers.target, achieved: parseInt(coverage.farmers.installed) },
                ]}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-800)', border: '1px solid var(--border-medium)', borderRadius: 8 }} />
                  <Bar dataKey="target" fill="rgba(255,255,255,0.08)" name="Target" radius={[4,4,0,0]} />
                  <Bar dataKey="achieved" fill="var(--solar-gold)" name="Achieved" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="grid grid-2">
          {[
            { title: '🏠 Household Register', type: 'households', icon: '📊', desc: 'Complete list of all households with solar status' },
            { title: '👨‍🌾 Farmer Register', type: 'farmers', icon: '📊', desc: 'Complete list of all farmers with pump status' },
          ].map(r => (
            <div key={r.type} className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>{r.title}</div>
              <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-4)' }}>{r.desc}</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-success btn-sm" onClick={() => downloadExcel(r.type)}>📥 Download Excel</button>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadTemplate(r.type)}>📋 Import Template</button>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>📋 All Data Export</div>
            <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-4)' }}>Download complete village data as ZIP</p>
            <button className="btn btn-primary btn-sm">📦 Export All Data</button>
          </div>
        </div>
      )}

      {/* QR Code Tab */}
      {activeTab === 'qr' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🔲 Generate QR Code</div>
          <div className="form-group">
            <label className="form-label">Entity Type</label>
            <select className="form-select" value={qrType} onChange={e => setQrType(e.target.value)}>
              <option value="households">🏠 Household</option>
              <option value="farmers">👨‍🌾 Farmer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Entity ID</label>
            <input className="form-input" placeholder="Enter household or farmer ID..." value={qrId} onChange={e => setQrId(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={generateQR}>🔲 Generate QR Code</button>
          {qrData && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <img src={qrData.qr} alt="QR Code" style={{ width: 200, height: 200, border: '1px solid var(--border-subtle)', borderRadius: 8 }} />
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qrData.url}</div>
              <a href={qrData.qr} download="qrcode.png" className="btn btn-ghost btn-sm" style={{ marginTop: 8, display: 'inline-flex' }}>⬇️ Download QR</a>
            </div>
          )}
        </div>
      )}

      {/* Action Plan Tab */}
      {activeTab === 'action-plan' && coverage && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📋 100% Solar Action Plan</div>
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
            ℹ️ To achieve 100% solar village status, complete the following tasks:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { icon: '🏠', task: `Complete ${coverage.households.target - coverage.households.installed} more rooftop solar installations`, done: parseInt(coverage.households.installed) >= coverage.households.target },
              { icon: '💧', task: `Complete ${coverage.farmers.target - coverage.farmers.installed} more solar pump installations`, done: parseInt(coverage.farmers.installed) >= coverage.farmers.target },
              { icon: '⚡', task: 'Identify and finalize 2MW solar land plant', done: false },
              { icon: '📝', task: 'Process all pending applications', done: false },
              { icon: '🔧', task: 'Resolve all open maintenance tickets', done: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3)', background: item.done ? 'rgba(64,197,132,0.05)' : 'var(--bg-700)', borderRadius: 'var(--radius-md)', border: `1px solid ${item.done ? 'rgba(64,197,132,0.2)' : 'var(--border-subtle)'}` }}>
                <span style={{ fontSize: '1.3rem' }}>{item.done ? '✅' : '⏳'}</span>
                <div>
                  <span style={{ fontSize: '0.85rem', color: item.done ? 'var(--emerald-light)' : 'var(--text-primary)' }}>{item.icon} {item.task}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

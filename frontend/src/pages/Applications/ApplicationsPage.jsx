// frontend/src/pages/Applications/ApplicationsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { applicationsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const STATUS_MAP = {
  submitted: { cls: 'badge-submitted', label: 'Submitted', icon: '📨' },
  surveyed:  { cls: 'badge-progress',  label: 'Surveyed',  icon: '🔍' },
  approved:  { cls: 'badge-approved',  label: 'Approved',  icon: '✅' },
  rejected:  { cls: 'badge-rejected',  label: 'Rejected',  icon: '❌' },
  installed: { cls: 'badge-installed', label: 'Installed', icon: '⚡' },
};

export default function ApplicationsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [apps, setApps]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', status: '', page: 1 });

  const fetchData = useCallback(() => {
    setLoading(true);
    // Do NOT pass village_id for mandal/district/state — backend resolves scope by role
    const params = { ...filters };
    if (user?.role === 'sarpanch' && user?.village_id) params.village_id = user.village_id;
    applicationsAPI.list(params)
      .then(r => { setApps(r.data || []); setTotal(r.total || 0); })
      .catch(() => toast.error('Failed to load applications'))
      .finally(() => setLoading(false));
  }, [filters, user?.role, user?.village_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = Object.keys(STATUS_MAP).reduce((acc, k) => {
    acc[k] = apps.filter(a => a.status === k).length;
    return acc;
  }, {});

  const handleApprove = async (id, e) => {
    e.stopPropagation();
    try {
      await applicationsAPI.updateStatus(id, { status: 'approved', comments: 'Approved by Sarpanch' });
      toast.success('Application approved! SMS sent.');
      fetchData();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id, e) => {
    e.stopPropagation();
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await applicationsAPI.updateStatus(id, { status: 'rejected', rejection_reason: reason });
      toast.success('Application rejected.');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const formatCurrency = v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">📝 Solar Applications</div>
          <div className="page-subheading">
            {total} total · {statusCounts.submitted || 0} pending approval
            <span className="page-subheading-dot" />
            Rooftop & PM-KUSUM Pump
          </div>
        </div>
      </div>

      {/* Status summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { k: 'submitted', label: 'Pending',   icon: '📨', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', color: 'var(--violet)' },
          { k: 'approved',  label: 'Approved',  icon: '✅', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', color: 'var(--sky)' },
          { k: 'installed', label: 'Installed', icon: '⚡', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: 'var(--emerald-light)' },
          { k: 'rejected',  label: 'Rejected',  icon: '❌', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)', color: '#FB7185' },
        ].map(s => (
          <div key={s.k}
            onClick={() => setFilters(f => ({ ...f, status: f.status === s.k ? '' : s.k }))}
            style={{
              background: filters.status === s.k ? s.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filters.status === s.k ? s.border : 'var(--border-subtle)'}`,
              borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, minWidth: 110,
              transition: 'all 200ms ease',
            }}>
            <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, lineHeight: 1 }}>{statusCounts[s.k] || 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Type tabs + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="tab-list" style={{ marginBottom: 0 }}>
          {[['', '🗂️ All'], ['rooftop', '🏠 Rooftop'], ['pump', '💧 Pump']].map(([v, l]) => (
            <button key={v} className={`tab-item ${filters.type === v ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, type: v, page: 1 }))}>
              {l}
            </button>
          ))}
        </div>
        <select className="filter-select" value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">All Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : apps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No applications found</div>
              <div className="empty-state-desc">Applications are created when households/farmers apply for solar.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Type</th>
                  <th>Applicant</th>
                  {user?.role !== 'sarpanch' && <th>Village</th>}
                  <th>Date</th>
                  <th>Central Sub.</th>
                  <th>State Sub.</th>
                  <th>Beneficiary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => {
                  const s = STATUS_MAP[app.status] || { cls: 'badge-pending', label: app.status, icon: '?' };
                  return (
                    <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <code style={{ color: 'var(--solar-gold)', fontSize: '0.73rem', background: 'rgba(245,166,35,0.08)', padding: '2px 7px', borderRadius: 5 }}>
                          {app.application_id}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${app.type === 'rooftop' ? 'badge-applied' : 'badge-progress'}`}>
                          {app.type === 'rooftop' ? '🏠 Rooftop' : '💧 Pump'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.83rem' }}>
                        {app.household_name || app.farmer_name || '—'}
                      </td>
                      {user?.role !== 'sarpanch' && (
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {app.village_name || '—'}
                        </td>
                      )}
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatDate(app.submitted_date)}</td>
                      <td>
                        <span style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>{app.subsidy_central_pct || 0}%</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--sky)', fontWeight: 700 }}>{app.subsidy_state_pct || 0}%</span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{formatCurrency(app.beneficiary_contribution)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.icon} {s.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {app.status === 'submitted' && ['sarpanch', 'mandal', 'admin'].includes(user?.role) && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-success btn-sm" title="Approve"
                              onClick={e => handleApprove(app.id, e)}>✅</button>
                            <button className="btn btn-danger btn-sm" title="Reject"
                              onClick={e => handleReject(app.id, e)}>❌</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-footer">
          <span>Showing {apps.length} of {total}</span>
          <div className="pagination">
            <button className="page-btn" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹</button>
            <button className="page-btn active">{filters.page}</button>
            <button className="page-btn" disabled={filters.page * 50 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

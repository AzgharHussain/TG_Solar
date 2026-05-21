// frontend/src/pages/Maintenance/MaintenancePage.jsx
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { complaintsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const URGENCY = {
  high:   { cls: 'badge-high',   label: 'High',   icon: '🔴', color: '#FB7185' },
  medium: { cls: 'badge-medium', label: 'Medium', icon: '🟡', color: 'var(--solar-gold)' },
  low:    { cls: 'badge-low',    label: 'Low',    icon: '🟢', color: 'var(--emerald-light)' },
};

const STATUS = {
  open:        { cls: 'badge-open',     label: 'Open',        icon: '🔴' },
  in_progress: { cls: 'badge-progress', label: 'In Progress', icon: '🔵' },
  resolved:    { cls: 'badge-resolved', label: 'Resolved',    icon: '✅' },
  closed:      { cls: 'badge-pending',  label: 'Closed',      icon: '⚫' },
};

const CATEGORIES = {
  rooftop:    ['No generation', 'Inverter error', 'Panel cleaning', 'Broken panel', 'Wiring issue', 'Other'],
  pump:       ['Pump not working', 'Low output', 'Electrical fault', 'Motor burn', 'Pipeline leak', 'Other'],
  land_plant: ['Grid disconnection', 'Inverter fault', 'Panel damage', 'Other'],
  other:      ['Other'],
};

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ status: '', urgency: '', asset_type: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [viewItem, setViewItem]     = useState(null);
  const [form, setForm] = useState({ asset_type: 'rooftop', category: 'No generation', description: '', urgency: 'medium', technician_name: '', technician_mobile: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    complaintsAPI.list({ ...filters, village_id: user?.village_id })
      .then(r => { setComplaints(r.data || []); setTotal(r.total || 0); })
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, [filters, user?.village_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = {
    open:     complaints.filter(c => c.status === 'open').length,
    progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const handleCreate = async () => {
    if (!form.description.trim()) return toast.error('Please add a description');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await complaintsAPI.create(fd);
      toast.success('Complaint registered! Ticket created. 🎫');
      setShowCreate(false);
      setForm({ asset_type: 'rooftop', category: 'No generation', description: '', urgency: 'medium', technician_name: '', technician_mobile: '' });
      fetchData();
    } catch { toast.error('Failed to register complaint'); }
    finally { setSubmitting(false); }
  };

  const handleResolve = async (id) => {
    const notes = prompt('Resolution notes (what was fixed?):');
    if (notes === null) return;
    try {
      await complaintsAPI.update(id, { status: 'resolved', resolution_notes: notes || 'Issue resolved' });
      toast.success('Complaint resolved! SMS sent to owner. ✅');
      setViewItem(null);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleAssign = async (id) => {
    const tech = prompt('Technician name:');
    if (!tech) return;
    try {
      await complaintsAPI.update(id, { status: 'in_progress', technician_name: tech });
      toast.success(`Assigned to ${tech}`);
      setViewItem(null);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🔧 Maintenance & Complaints</div>
          <div className="page-subheading">
            {counts.open} open · {counts.progress} in progress · {counts.resolved} resolved
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>➕ Register Complaint</button>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { label: 'Open',        val: counts.open,     icon: '🔴', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   color: '#FB7185', k: 'open' },
          { label: 'In Progress', val: counts.progress, icon: '🔵', bg: 'rgba(56,189,248,0.08)',   border: 'rgba(56,189,248,0.2)',  color: 'var(--sky)', k: 'in_progress' },
          { label: 'Resolved',    val: counts.resolved, icon: '✅', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.2)', color: 'var(--emerald-light)', k: 'resolved' },
          { label: 'Total',       val: total,           icon: '📋', bg: 'rgba(255,255,255,0.03)', border: 'var(--border-subtle)', color: 'var(--text-primary)', k: '' },
        ].map(s => (
          <div key={s.label}
            onClick={() => setFilters(f => ({ ...f, status: f.status === s.k ? '' : s.k }))}
            style={{
              background: filters.status === s.k ? s.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filters.status === s.k ? s.border : 'var(--border-subtle)'}`,
              borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 200ms ease',
            }}>
            <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ marginBottom: 'var(--space-4)' }}>
        {[
          { key: 'urgency',    label: 'Priority', options: [['', 'All Priority'], ['high', '🔴 High'], ['medium', '🟡 Medium'], ['low', '🟢 Low']] },
          { key: 'asset_type', label: 'Asset',    options: [['', 'All Assets'], ['rooftop', '🏠 Rooftop'], ['pump', '💧 Pump'], ['land_plant', '⚡ Plant']] },
        ].map(({ key, options }) => (
          <select key={key} className="filter-select" value={filters[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔧</div>
              <div className="empty-state-title">No complaints found</div>
              <div className="empty-state-desc">Solar systems are working fine! Register a complaint if any issue arises.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>➕ Register Complaint</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Technician</th>
                  <th>Raised</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => {
                  const urg = URGENCY[c.urgency] || URGENCY.medium;
                  const sts = STATUS[c.status]   || STATUS.open;
                  return (
                    <tr key={c.id} onClick={() => setViewItem(c)} style={{ cursor: 'pointer' }}>
                      <td>
                        <code style={{ color: 'var(--solar-gold)', fontSize: '0.73rem', background: 'rgba(245,166,35,0.08)', padding: '2px 7px', borderRadius: 5 }}>
                          {c.ticket_id}
                        </code>
                      </td>
                      <td>
                        <span className="badge badge-applied" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                          {c.asset_type === 'rooftop' ? '🏠' : c.asset_type === 'pump' ? '💧' : '⚡'} {c.asset_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.category}</td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {c.description}
                      </td>
                      <td><span className={`badge ${urg.cls}`}>{urg.icon} {urg.label}</span></td>
                      <td><span className={`badge ${sts.cls}`}>{sts.icon} {sts.label}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {c.technician_name ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
                            {c.technician_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.status === 'open' && (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}
                              onClick={() => handleAssign(c.id)}>👷 Assign</button>
                          )}
                          {(c.status === 'open' || c.status === 'in_progress') && (
                            <button className="btn btn-success btn-sm" style={{ fontSize: '0.7rem' }}
                              onClick={() => handleResolve(c.id)}>✅ Resolve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-footer"><span>{total} total tickets</span></div>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔧 Register Complaint</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Asset Type <span className="required">*</span></label>
                  <select className="form-select" value={form.asset_type}
                    onChange={e => setForm(f => ({ ...f, asset_type: e.target.value, category: CATEGORIES[e.target.value]?.[0] || '' }))}>
                    <option value="rooftop">🏠 Rooftop Solar</option>
                    <option value="pump">💧 Solar Pump</option>
                    <option value="land_plant">⚡ Land Plant</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category <span className="required">*</span></label>
                  <select className="form-select" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {(CATEGORIES[form.asset_type] || ['Other']).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Priority <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(URGENCY).map(([k, v]) => (
                    <button key={k} type="button"
                      onClick={() => setForm(f => ({ ...f, urgency: k }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid',
                        borderColor: form.urgency === k ? v.color : 'var(--border-subtle)',
                        background: form.urgency === k ? `${v.color}18` : 'rgba(255,255,255,0.03)',
                        color: form.urgency === k ? v.color : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                        transition: 'all 200ms ease',
                      }}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description <span className="required">*</span></label>
                <textarea className="form-textarea" rows={4}
                  placeholder="Describe the issue in detail — what happened, when, affected area..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Technician Name (optional)</label>
                  <input className="form-input" placeholder="Assign to technician"
                    value={form.technician_name}
                    onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Technician Mobile</label>
                  <input className="form-input" placeholder="10-digit mobile"
                    value={form.technician_mobile}
                    onChange={e => setForm(f => ({ ...f, technician_mobile: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '🔧 Register Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-title">🎫 {viewItem.ticket_id}</div>
                <span className={`badge ${URGENCY[viewItem.urgency]?.cls}`}>
                  {URGENCY[viewItem.urgency]?.icon} {URGENCY[viewItem.urgency]?.label}
                </span>
              </div>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  ['Status',      <span className={`badge ${STATUS[viewItem.status]?.cls}`}>{STATUS[viewItem.status]?.icon} {STATUS[viewItem.status]?.label}</span>],
                  ['Asset',       viewItem.asset_type?.replace('_', ' ')],
                  ['Category',    viewItem.category],
                  ['Description', viewItem.description],
                  ['Technician',  viewItem.technician_name || '—'],
                  ['Raised On',   new Date(viewItem.created_at).toLocaleDateString('en-IN')],
                  ['Resolution',  viewItem.resolution_notes || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', fontWeight: 700, width: 100, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>{label}</span>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', flex: 1 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewItem(null)}>Close</button>
              {viewItem.status === 'open' && (
                <button className="btn btn-ghost" onClick={() => handleAssign(viewItem.id)}>👷 Assign</button>
              )}
              {(viewItem.status === 'open' || viewItem.status === 'in_progress') && (
                <button className="btn btn-success" onClick={() => handleResolve(viewItem.id)}>✅ Mark Resolved</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// frontend/src/pages/Households/HouseholdsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { householdsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import HouseholdModal from './HouseholdModal';

const STATUS_MAP = {
  not_applied: { cls: 'badge-pending',   label: 'Not Applied', icon: '⚪' },
  applied:     { cls: 'badge-applied',   label: 'Applied',     icon: '🔵' },
  installed:   { cls: 'badge-installed', label: 'Installed',   icon: '✅' },
};

const ROOF_ICONS = { flat: '🏠', sloped: '🏡', tiled: '🏘️' };

export default function HouseholdsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', ward_no: '', page: 1 });

  const fetchData = useCallback(() => {
    setLoading(true);
    householdsAPI.list({ ...filters, village_id: user?.village_id })
      .then(r => { setHouseholds(r.data || []); setTotal(r.total || 0); })
      .catch(() => toast.error('Failed to load households'))
      .finally(() => setLoading(false));
  }, [filters, user?.village_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    installed:   households.filter(h => h.solar_status === 'installed').length,
    applied:     households.filter(h => h.solar_status === 'applied').length,
    not_applied: households.filter(h => h.solar_status === 'not_applied').length,
  };

  const handleApplySolar = async (id, e) => {
    e.stopPropagation();
    try {
      await householdsAPI.applySolar(id);
      toast.success('Solar application submitted! SMS sent.');
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this household?')) return;
    try {
      await householdsAPI.delete(id, { reason: 'Deleted by Sarpanch' });
      toast.success('Household deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🏠 Household Management</div>
          <div className="page-subheading">
            {total} registered
            <span className="page-subheading-dot" />
            {stats.installed} installed
            <span className="page-subheading-dot" />
            {stats.applied} pending
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bulk')}>📥 Bulk Import</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowModal(true); }}>➕ Add Household</button>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',       val: total,             color: 'var(--text-primary)',  bg: 'rgba(255,255,255,0.04)', border: 'var(--border-subtle)' },
          { label: 'Installed',   val: stats.installed,   color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Applied',     val: stats.applied,     color: 'var(--solar-gold)',    bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
          { label: 'Not Applied', val: stats.not_applied, color: 'var(--text-muted)',    bg: 'rgba(255,255,255,0.03)', border: 'var(--border-subtle)' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 10, padding: '10px 18px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90,
          }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, lineHeight: 1 }}>{s.val}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-box">
            <span style={{ color: 'var(--text-faint)' }}>🔍</span>
            <input
              placeholder="Search name, house no, mobile..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>
          <div className="filter-row">
            <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="not_applied">Not Applied</option>
              <option value="applied">Applied</option>
              <option value="installed">Installed</option>
            </select>
            <select className="filter-select" value={filters.ward_no} onChange={e => setFilters(f => ({ ...f, ward_no: e.target.value, page: 1 }))}>
              <option value="">All Wards</option>
              {Array.from({ length: 15 }, (_, i) => <option key={i+1} value={i+1}>Ward {i+1}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : households.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏠</div>
              <div className="empty-state-title">No households found</div>
              <div className="empty-state-desc">Add the first household to start tracking solar coverage.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>➕ Add Household</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Household ID</th>
                  <th>Head of Family</th>
                  <th>Ward / House</th>
                  <th>Roof</th>
                  <th>Capacity</th>
                  <th>Mobile</th>
                  <th>Solar Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {households.map((hh, idx) => (
                  <tr key={hh.id} onClick={() => navigate(`/households/${hh.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{(filters.page - 1) * 50 + idx + 1}</td>
                    <td><code style={{ color: 'var(--solar-gold)', fontSize: '0.75rem', background: 'rgba(245,166,35,0.08)', padding: '2px 7px', borderRadius: 5 }}>{hh.household_id}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(245,166,35,0.2),rgba(16,185,129,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {hh.head_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{hh.head_name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{hh.family_members || '—'} members</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        W{hh.ward_no} / {hh.house_no}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {ROOF_ICONS[hh.roof_type]} {hh.roof_area ? `${hh.roof_area} sqft` : '—'}
                    </td>
                    <td style={{ color: 'var(--sky)', fontWeight: 600, fontSize: '0.82rem' }}>
                      {hh.recommended_capacity ? `${hh.recommended_capacity} kW` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{hh.mobile || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_MAP[hh.solar_status]?.cls || 'badge-pending'}`}>
                        {STATUS_MAP[hh.solar_status]?.icon} {STATUS_MAP[hh.solar_status]?.label}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {hh.solar_status === 'not_applied' && (
                          <button className="btn btn-success btn-sm" onClick={e => handleApplySolar(hh.id, e)}>Apply ☀️</button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                          onClick={e => { e.stopPropagation(); setEditItem(hh); setShowModal(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                          onClick={e => handleDelete(hh.id, e)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-footer">
          <span>Showing {households.length} of {total} households</span>
          <div className="pagination">
            <button className="page-btn" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹</button>
            <button className="page-btn active">{filters.page}</button>
            <button className="page-btn" disabled={filters.page * 50 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>›</button>
          </div>
        </div>
      </div>

      {showModal && (
        <HouseholdModal
          editData={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { setShowModal(false); setEditItem(null); fetchData(); }}
        />
      )}
    </div>
  );
}

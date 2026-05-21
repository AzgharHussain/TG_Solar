// frontend/src/pages/Farmers/FarmersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { farmersAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import FarmerModal from './FarmerModal';

const PUMP_STATUS = {
  no_pump:  { cls: 'badge-pending',   label: 'No Pump',    icon: '⚪', color: 'var(--text-muted)' },
  diesel:   { cls: 'badge-pending',   label: 'Diesel',     icon: '⛽', color: '#FF6B35' },
  electric: { cls: 'badge-progress',  label: 'Electric',   icon: '⚡', color: 'var(--sky)' },
  applied:  { cls: 'badge-applied',   label: 'Applied',    icon: '🔵', color: 'var(--solar-gold)' },
  installed:{ cls: 'badge-installed', label: 'Installed',  icon: '✅', color: 'var(--emerald-light)' },
};

const WATER_ICONS = { borewell: '🕳️', open_well: '⭕', canal: '🌊', tank: '🏊', other: '💧' };

export default function FarmersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [farmers, setFarmers]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [filters, setFilters]     = useState({ search: '', pump_status: '', page: 1 });

  const fetchData = useCallback(() => {
    setLoading(true);
    farmersAPI.list({ ...filters, village_id: user?.village_id })
      .then(r => { setFarmers(r.data || []); setTotal(r.total || 0); })
      .catch(() => toast.error('Failed to load farmers'))
      .finally(() => setLoading(false));
  }, [filters, user?.village_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    installed: farmers.filter(f => f.pump_status === 'installed').length,
    applied:   farmers.filter(f => f.pump_status === 'applied').length,
    diesel:    farmers.filter(f => f.pump_status === 'diesel').length,
  };

  const handleApplyPump = async (id, e) => {
    e.stopPropagation();
    try {
      await farmersAPI.applyPump(id, { hp: 5 });
      toast.success('Pump application submitted! 💧');
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this farmer record?')) return;
    try { await farmersAPI.delete(id); toast.success('Farmer deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-heading">🌾 Farmer Management</div>
          <div className="page-subheading">
            {total} registered · PM-KUSUM Solar Pump Scheme
            <span className="page-subheading-dot" />
            {stats.installed} installed · {stats.applied} applied
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>📊 Reports</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowModal(true); }}>➕ Add Farmer</button>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     val: total,           color: 'var(--text-primary)',   bg: 'rgba(255,255,255,0.04)', border: 'var(--border-subtle)' },
          { label: 'Installed', val: stats.installed, color: 'var(--emerald-light)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Applied',   val: stats.applied,   color: 'var(--solar-gold)',    bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
          { label: 'Diesel Pump',val: stats.diesel,   color: '#FF6B35',              bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)' },
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
        <div className="table-toolbar">
          <div className="search-box">
            <span style={{ color: 'var(--text-faint)' }}>🔍</span>
            <input
              placeholder="Search name, survey no, mobile..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>
          <div className="filter-row">
            <select className="filter-select" value={filters.pump_status}
              onChange={e => setFilters(f => ({ ...f, pump_status: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="no_pump">No Pump</option>
              <option value="diesel">Diesel Pump</option>
              <option value="electric">Electric Pump</option>
              <option value="applied">Solar Applied</option>
              <option value="installed">Solar Installed</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : farmers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌾</div>
              <div className="empty-state-title">No farmers found</div>
              <div className="empty-state-desc">Register farmers to manage PM-KUSUM pump applications.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>➕ Add Farmer</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer ID</th>
                  <th>Farmer Name</th>
                  <th>Survey No.</th>
                  <th>Land</th>
                  <th>Water Source</th>
                  <th>Current Pump</th>
                  <th>Solar Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((f, idx) => (
                  <tr key={f.id} onClick={() => navigate(`/farmers/${f.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{idx + 1}</td>
                    <td><code style={{ color: 'var(--emerald-light)', fontSize: '0.75rem', background: 'rgba(16,185,129,0.08)', padding: '2px 7px', borderRadius: 5 }}>{f.farmer_id}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(56,189,248,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {f.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{f.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{f.mobile || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{f.survey_number}</td>
                    <td style={{ color: 'var(--solar-gold)', fontWeight: 600, fontSize: '0.82rem' }}>{f.land_extent} ac</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {WATER_ICONS[f.water_source]} {f.water_source?.replace('_', ' ')}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {f.current_pump_type && f.current_pump_type !== 'none'
                        ? `${f.current_pump_hp}HP ${f.current_pump_type}`
                        : <span style={{ color: 'var(--text-faint)' }}>None</span>}
                    </td>
                    <td>
                      <span className={`badge ${PUMP_STATUS[f.pump_status]?.cls || 'badge-pending'}`}>
                        {PUMP_STATUS[f.pump_status]?.icon} {PUMP_STATUS[f.pump_status]?.label || f.pump_status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['no_pump','diesel','electric'].includes(f.pump_status) && (
                          <button className="btn btn-success btn-sm" onClick={e => handleApplyPump(f.id, e)}>Apply 💧</button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                          onClick={e => { e.stopPropagation(); setEditItem(f); setShowModal(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                          onClick={e => handleDelete(f.id, e)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-footer">
          <span>Showing {farmers.length} of {total} farmers</span>
          <div className="pagination">
            <button className="page-btn" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹</button>
            <button className="page-btn active">{filters.page}</button>
            <button className="page-btn" disabled={filters.page * 50 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>›</button>
          </div>
        </div>
      </div>

      {showModal && (
        <FarmerModal
          editData={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { setShowModal(false); setEditItem(null); fetchData(); }}
        />
      )}
    </div>
  );
}

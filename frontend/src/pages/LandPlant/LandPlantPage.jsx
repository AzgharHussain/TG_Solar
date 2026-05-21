// frontend/src/pages/LandPlant/LandPlantPage.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { landAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const STATUS_FLOW = ['identified', 'contacted', 'negotiation', 'agreed', 'signed', 'installed'];
const STATUS_COLORS = { identified: 'badge-pending', contacted: 'badge-progress', negotiation: 'badge-applied', agreed: 'badge-approved', signed: 'badge-submitted', installed: 'badge-installed' };

export default function LandPlantPage() {
  const { user } = useAuthStore();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ survey_number: '', extent_acres: '', land_use: 'fallow', owner_name: '', owner_contact: '', distance_from_village: '', grid_distance: '', plant_capacity_mw: '2', status_notes: '' });

  const fetchData = () => {
    landAPI.list({ village_id: user?.village_id })
      .then(r => setParcels(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (editItem) {
        await landAPI.update(editItem.id, form);
        toast.success('Updated!');
      } else {
        await landAPI.create(fd);
        toast.success('Land parcel added!');
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ survey_number: '', extent_acres: '', land_use: 'fallow', owner_name: '', owner_contact: '', distance_from_village: '', grid_distance: '', plant_capacity_mw: '2', status_notes: '' });
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await landAPI.update(id, { status });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-heading">⚡ Land Solar Plant Management</div>
          <div className="page-subheading">Identify and track land parcels for 2MW solar plant</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Land Parcel</button>
      </div>

      {/* Status Pipeline */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>📈 Pipeline Status</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {STATUS_FLOW.map((s, idx) => {
            const count = parcels.filter(p => p.status === s).length;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ textAlign: 'center', minWidth: 100, background: 'var(--bg-700)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: count > 0 ? 'var(--solar-gold)' : 'var(--text-muted)' }}>{count}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</div>
                </div>
                {idx < STATUS_FLOW.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : parcels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌍</div>
          <div className="empty-state-title">No land parcels identified yet</div>
          <div className="empty-state-desc">Add land parcels suitable for 2MW solar plant installation</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>➕ Add Land Parcel</button>
        </div>
      ) : (
        <div className="grid grid-2">
          {parcels.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Survey No: {p.survey_number}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.extent_acres} acres • {p.land_use}</div>
                </div>
                <span className={`badge ${STATUS_COLORS[p.status] || 'badge-pending'}`}>{p.status}</span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                {p.owner_name && <div>Owner: {p.owner_name} ({p.owner_contact})</div>}
                {p.distance_from_village && <div>Distance: {p.distance_from_village} km from village</div>}
                {p.grid_distance && <div>Grid: {p.grid_distance} km to nearest grid</div>}
                {p.plant_capacity_mw && <div>Target: {p.plant_capacity_mw} MW</div>}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {STATUS_FLOW.indexOf(p.status) < STATUS_FLOW.length - 1 && (
                  <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(p.id, STATUS_FLOW[STATUS_FLOW.indexOf(p.status) + 1])}>
                    → {STATUS_FLOW[STATUS_FLOW.indexOf(p.status) + 1]}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(p); setForm({ ...p }); setShowModal(true); }}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Delete?')) { await landAPI.delete(p.id); fetchData(); } }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? '✏️ Edit Land Parcel' : '➕ Add Land Parcel'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Survey Number</label>
                  <input className="form-input" value={form.survey_number} onChange={e => setForm(f => ({ ...f, survey_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Extent (Acres)</label>
                  <input type="number" step="0.1" className="form-input" value={form.extent_acres} onChange={e => setForm(f => ({ ...f, extent_acres: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Land Use</label>
                  <select className="form-select" value={form.land_use} onChange={e => setForm(f => ({ ...f, land_use: e.target.value }))}>
                    <option value="fallow">Fallow</option>
                    <option value="agricultural">Agricultural</option>
                    <option value="wasteland">Wasteland</option>
                    <option value="government">Government</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Plant Capacity (MW)</label>
                  <input type="number" step="0.1" className="form-input" value={form.plant_capacity_mw} onChange={e => setForm(f => ({ ...f, plant_capacity_mw: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Contact</label>
                  <input className="form-input" value={form.owner_contact} onChange={e => setForm(f => ({ ...f, owner_contact: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Distance from Village (km)</label>
                  <input type="number" step="0.1" className="form-input" value={form.distance_from_village} onChange={e => setForm(f => ({ ...f, distance_from_village: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Grid Distance (km)</label>
                  <input type="number" step="0.1" className="form-input" value={form.grid_distance} onChange={e => setForm(f => ({ ...f, grid_distance: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.status_notes} onChange={e => setForm(f => ({ ...f, status_notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

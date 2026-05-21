// frontend/src/pages/Households/HouseholdDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { householdsAPI } from '../../services/api';
import HouseholdModal from './HouseholdModal';

export default function HouseholdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [installForm, setInstallForm] = useState({ installation_date: '', installed_capacity: '', vendor_name: '' });
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const fetchData = () => {
    householdsAPI.get(id).then(r => setData(r.data)).catch(() => navigate('/households')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleApply = async () => {
    try {
      await householdsAPI.applySolar(id);
      toast.success('Solar application submitted!');
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleInstall = async () => {
    try {
      await householdsAPI.markInstalled(id, installForm);
      toast.success('Marked as installed! 🌞');
      setShowInstall(false);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (!data) return null;

  const statusBadge = { not_applied: 'badge-pending', applied: 'badge-applied', installed: 'badge-installed' }[data.solar_status];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/households')} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>← Back to Households</button>
          <div className="page-heading">🏠 {data.head_name}</div>
          <div className="page-subheading">{data.household_id} • Ward {data.ward_no}, House {data.house_no}</div>
        </div>
        <div className="page-header-actions">
          {data.solar_status === 'not_applied' && <button className="btn btn-primary" onClick={handleApply}>☀️ Apply for Solar</button>}
          {data.solar_status === 'applied' && <button className="btn btn-success" onClick={() => setShowInstall(true)}>✅ Mark Installed</button>}
          <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>✏️ Edit</button>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Household Info */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📋 Household Details</div>
          <table style={{ width: '100%' }}>
            <tbody>
              {[
                ['Status', <span className={`badge ${statusBadge}`}>{data.solar_status.replace('_', ' ')}</span>],
                ['Mobile', data.mobile || '—'],
                ['Family Members', data.family_members],
                ['BPL Card', data.bpl_card_no || '—'],
                ['Consumer No.', data.consumer_no || '—'],
                ['Avg Bill', data.avg_monthly_bill ? `₹${data.avg_monthly_bill}/month` : '—'],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', width: '40%' }}>{label}</td>
                  <td style={{ padding: '8px 0', fontSize: '0.82rem', fontWeight: 500 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Roof Details */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏠 Roof & Solar Details</div>
          <table style={{ width: '100%' }}>
            <tbody>
              {[
                ['Roof Type', data.roof_type],
                ['Dimensions', `${data.roof_length} × ${data.roof_width} ft`],
                ['Roof Area', `${data.roof_area} sqft`],
                ['Recommended', <span style={{ color: 'var(--solar-gold)', fontWeight: 700 }}>{data.recommended_capacity} kW</span>],
                ['Installed Capacity', data.installed_capacity ? <span style={{ color: 'var(--emerald-light)' }}>{data.installed_capacity} kW</span> : '—'],
                ['Vendor', data.vendor_name || '—'],
                ['Install Date', data.installation_date ? new Date(data.installation_date).toLocaleDateString('en-IN') : '—'],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', width: '40%' }}>{label}</td>
                  <td style={{ padding: '8px 0', fontSize: '0.82rem', fontWeight: 500 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Photos */}
        {data.photos?.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📷 Photos</div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {data.photos.map(p => (
                <a key={p.id} href={`${API_BASE}${p.file_url}`} target="_blank" rel="noreferrer">
                  <img src={`${API_BASE}${p.file_url}`} alt={p.photo_type}
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Application History */}
        {data.applications?.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📝 Application History</div>
            <div className="timeline">
              {data.applications.map(app => (
                <div key={app.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-date">{new Date(app.submitted_date || app.created_at).toLocaleDateString('en-IN')}</div>
                  <div className="timeline-title">{app.application_id}</div>
                  <div className="timeline-content">
                    Status: <span className={`badge badge-${app.status}`}>{app.status}</span>
                    {app.total_cost && <span style={{ marginLeft: 8 }}>Total: ₹{Number(app.total_cost).toLocaleString()}</span>}
                    {app.beneficiary_contribution && <div>Your share: ₹{Number(app.beneficiary_contribution).toLocaleString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      {data.latitude && data.longitude && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>📍 Location</div>
          <div style={{ background: 'var(--bg-700)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Lat: {data.latitude}, Lon: {data.longitude}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={() => window.open(`https://maps.google.com/?q=${data.latitude},${data.longitude}`, '_blank')}>
              🗺️ View in Maps
            </button>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {showInstall && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-title">✅ Mark as Installed</div>
              <button className="modal-close" onClick={() => setShowInstall(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Installation Date</label>
                <input type="date" className="form-input" value={installForm.installation_date} onChange={e => setInstallForm(f => ({ ...f, installation_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Installed Capacity (kW)</label>
                <input type="number" className="form-input" step="0.1" value={installForm.installed_capacity} onChange={e => setInstallForm(f => ({ ...f, installed_capacity: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Name</label>
                <input className="form-input" value={installForm.vendor_name} onChange={e => setInstallForm(f => ({ ...f, vendor_name: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInstall(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleInstall}>✅ Confirm Installed</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && <HouseholdModal editData={data} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); fetchData(); }} />}
    </div>
  );
}

// frontend/src/pages/Farmers/FarmerDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { farmersAPI } from '../../services/api';
import FarmerModal from './FarmerModal';

export default function FarmerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [installForm, setInstallForm] = useState({ installation_date: '', installed_hp: '', vendor_name: '' });

  const fetchData = () => {
    farmersAPI.get(id).then(r => setData(r.data)).catch(() => navigate('/farmers')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [id]);

  const handleApply = async () => {
    try { await farmersAPI.applyPump(id, { hp: 5 }); toast.success('Pump application submitted!'); fetchData(); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleInstall = async () => {
    try { await farmersAPI.markInstalled(id, installForm); toast.success('Pump installed! 💧'); setShowInstall(false); fetchData(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/farmers')} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>← Back</button>
          <div className="page-heading">👨‍🌾 {data.name}</div>
          <div className="page-subheading">{data.farmer_id} • Survey No: {data.survey_number}</div>
        </div>
        <div className="page-header-actions">
          {['no_pump','diesel','electric'].includes(data.pump_status) && (
            <button className="btn btn-success" onClick={handleApply}>💧 Apply for Pump</button>
          )}
          {data.pump_status === 'applied' && (
            <button className="btn btn-primary" onClick={() => setShowInstall(true)}>✅ Mark Installed</button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>✏️ Edit</button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📋 Farmer Details</div>
          <table style={{ width: '100%' }}>
            <tbody>
              {[
                ['Mobile', data.mobile],
                ['Aadhaar', data.aadhaar || '—'],
                ['Land Extent', `${data.land_extent} acres`],
                ['Water Source', data.water_source?.replace('_', ' ')],
                ['Irrigation', data.irrigation_need?.replace('_', ' ')],
                ['Current Pump', `${data.current_pump_hp || '—'} HP ${data.current_pump_type}`],
                ['Crops', Array.isArray(data.crops) ? data.crops.join(', ') : '—'],
              ].map(([l, v]) => (
                <tr key={l} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', width: '40%' }}>{l}</td>
                  <td style={{ padding: '8px 0', fontSize: '0.82rem' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>💧 Pump Status</div>
          <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>
              {data.pump_status === 'installed' ? '✅' : data.pump_status === 'applied' ? '⏳' : '❌'}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase' }}>{data.pump_status?.replace('_', ' ')}</div>
            {data.installed_hp && <div style={{ color: 'var(--emerald-light)', marginTop: 8 }}>{data.installed_hp} HP Solar Pump Installed</div>}
            {data.vendor_name && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>By: {data.vendor_name}</div>}
            {data.installation_date && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>On: {new Date(data.installation_date).toLocaleDateString('en-IN')}</div>}
          </div>
        </div>
      </div>

      {showInstall && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-title">💧 Mark Pump as Installed</div>
              <button className="modal-close" onClick={() => setShowInstall(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Installation Date</label>
                <input type="date" className="form-input" value={installForm.installation_date} onChange={e => setInstallForm(f => ({ ...f, installation_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Installed HP</label>
                <select className="form-select" value={installForm.installed_hp} onChange={e => setInstallForm(f => ({ ...f, installed_hp: e.target.value }))}>
                  <option value="3">3 HP</option>
                  <option value="5">5 HP</option>
                  <option value="7.5">7.5 HP</option>
                  <option value="10">10 HP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Name</label>
                <input className="form-input" value={installForm.vendor_name} onChange={e => setInstallForm(f => ({ ...f, vendor_name: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInstall(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleInstall}>✅ Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showEdit && <FarmerModal editData={data} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); fetchData(); }} />}
    </div>
  );
}

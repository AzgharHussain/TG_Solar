// frontend/src/pages/Farmers/FarmerModal.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { farmersAPI } from '../../services/api';

const CROPS = ['Paddy', 'Cotton', 'Maize', 'Vegetables', 'Groundnut', 'Soybean', 'Sugarcane', 'Turmeric', 'Chilli', 'Sunflower'];

export default function FarmerModal({ editData, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: editData || {} });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'crops') {
          const selected = Array.isArray(v) ? v : [v];
          selected.filter(Boolean).forEach(c => fd.append('crops', c));
        } else if (k !== 'pahani_file' && k !== 'passbook_file' && v !== undefined && v !== null && v !== '') {
          fd.append(k, v);
        }
      });
      if (data.pahani_file?.[0]) fd.append('pahani', data.pahani_file[0]);
      if (data.passbook_file?.[0]) fd.append('passbook', data.passbook_file[0]);

      if (editData) {
        await farmersAPI.update(editData.id, fd);
        toast.success('Farmer updated');
      } else {
        await farmersAPI.create(fd);
        toast.success('Farmer added! 👨‍🌾');
      }
      onSaved();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{editData ? '✏️ Edit Farmer' : '➕ Add New Farmer'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form id="farmer-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Farmer Name <span className="required">*</span></label>
                <input className="form-input" {...register('name', { required: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile <span className="required">*</span></label>
                <input className="form-input" {...register('mobile', { required: true })} />
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Aadhaar Number</label>
                <input className="form-input" {...register('aadhaar')} />
              </div>
              <div className="form-group">
                <label className="form-label">Survey Number <span className="required">*</span></label>
                <input className="form-input" {...register('survey_number', { required: true })} />
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="form-label">Land Extent (Acres)</label>
                <input type="number" step="0.1" className="form-input" {...register('land_extent')} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Pump</label>
                <select className="form-select" {...register('current_pump_type')}>
                  <option value="none">No Pump</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pump HP</label>
                <select className="form-select" {...register('current_pump_hp')}>
                  <option value="3">3 HP</option>
                  <option value="5">5 HP</option>
                  <option value="7.5">7.5 HP</option>
                  <option value="10">10 HP</option>
                </select>
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Water Source</label>
                <select className="form-select" {...register('water_source')}>
                  <option value="borewell">Borewell</option>
                  <option value="open_well">Open Well</option>
                  <option value="canal">Canal</option>
                  <option value="tank">Tank</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Irrigation Need</label>
                <select className="form-select" {...register('irrigation_need')}>
                  <option value="year_round">Year Round</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="rain_fed">Rain-fed Only</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Crops Grown</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CROPS.map(crop => (
                  <label key={crop} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" value={crop} {...register('crops')} />
                    {crop}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input type="number" step="any" className="form-input" {...register('latitude')} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input type="number" step="any" className="form-input" {...register('longitude')} />
              </div>
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Pahani / Land Record</label>
                <input type="file" className="form-input" accept="image/*,application/pdf" {...register('pahani_file')} />
              </div>
              <div className="form-group">
                <label className="form-label">Bank Passbook</label>
                <input type="file" className="form-input" accept="image/*,application/pdf" {...register('passbook_file')} />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="farmer-form" className="btn btn-success" disabled={loading}>
            {loading ? '...' : `💾 ${editData ? 'Update' : 'Add Farmer'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

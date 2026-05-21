// frontend/src/pages/Households/HouseholdModal.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { householdsAPI } from '../../services/api';

export default function HouseholdModal({ editData, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [roofArea, setRoofArea] = useState(null);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({ defaultValues: editData || {} });

  const roofLen = watch('roof_length');
  const roofWid = watch('roof_width');

  useEffect(() => {
    if (roofLen && roofWid) {
      const area = (parseFloat(roofLen) * parseFloat(roofWid)).toFixed(2);
      setRoofArea(area);
    }
  }, [roofLen, roofWid]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
      if (data.house_front_file?.[0]) fd.append('house_front', data.house_front_file[0]);
      if (data.roof_photo_file?.[0]) fd.append('roof_photo', data.roof_photo_file[0]);
      if (data.bill_photo_file?.[0]) fd.append('bill_photo', data.bill_photo_file[0]);

      if (editData) {
        await householdsAPI.update(editData.id, fd);
        toast.success('Household updated successfully');
      } else {
        await householdsAPI.create(fd);
        toast.success('Household added successfully! 🏠');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{editData ? '✏️ Edit Household' : '➕ Add New Household'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form id="hh-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Head of Family Name <span className="required">*</span></label>
                <input className="form-input" placeholder="Full name" {...register('head_name', { required: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" placeholder="10-digit mobile" {...register('mobile')} />
              </div>
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Ward Number <span className="required">*</span></label>
                <select className="form-select" {...register('ward_no', { required: true })}>
                  <option value="">Select Ward</option>
                  {Array.from({ length: 15 }, (_, i) => <option key={i+1} value={i+1}>Ward {i+1}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">House Number <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. 2-45" {...register('house_no', { required: true })} />
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="form-label">Family Members</label>
                <input type="number" className="form-input" min="1" {...register('family_members')} />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number</label>
                <input className="form-input" placeholder="12-digit Aadhaar" {...register('aadhaar')} />
              </div>
              <div className="form-group">
                <label className="form-label">BPL Card Number</label>
                <input className="form-input" {...register('bpl_card_no')} />
              </div>
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Electricity Consumer No.</label>
                <input className="form-input" {...register('consumer_no')} />
              </div>
              <div className="form-group">
                <label className="form-label">Average Monthly Bill (₹)</label>
                <input type="number" className="form-input" {...register('avg_monthly_bill')} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-4) 0', paddingTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>🏠 Roof Details</h4>
              <div className="form-row form-row-4">
                <div className="form-group">
                  <label className="form-label">Roof Type</label>
                  <select className="form-select" {...register('roof_type')}>
                    <option value="flat">Flat</option>
                    <option value="sloped">Sloped</option>
                    <option value="tiled">Tiled</option>
                    <option value="thatched">Thatched</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Length (ft) <span className="required">*</span></label>
                  <input type="number" className="form-input" step="0.1" {...register('roof_length', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Width (ft) <span className="required">*</span></label>
                  <input type="number" className="form-input" step="0.1" {...register('roof_width', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Calculated Area</label>
                  <input className="form-input" value={roofArea ? `${roofArea} sqft → ${(roofArea/10).toFixed(1)} kW` : '—'} readOnly style={{ color: 'var(--solar-gold)' }} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-4) 0', paddingTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>📍 Location</h4>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input type="number" step="any" className="form-input" placeholder="e.g. 18.758" {...register('latitude')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input type="number" step="any" className="form-input" placeholder="e.g. 79.496" {...register('longitude')} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-4) 0', paddingTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>📷 Photos</h4>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label">House Front Photo</label>
                  <input type="file" className="form-input" accept="image/*" {...register('house_front_file')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Roof Photo</label>
                  <input type="file" className="form-input" accept="image/*" {...register('roof_photo_file')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Electricity Bill</label>
                  <input type="file" className="form-input" accept="image/*,application/pdf" {...register('bill_photo_file')} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Internal Notes</label>
              <textarea className="form-textarea" placeholder="Any internal notes..." {...register('internal_notes')} />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="hh-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : `💾 ${editData ? 'Update' : 'Add Household'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

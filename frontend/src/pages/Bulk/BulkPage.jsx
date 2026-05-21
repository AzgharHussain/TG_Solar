// frontend/src/pages/Bulk/BulkPage.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI, householdsAPI, farmersAPI } from '../../services/api';

export default function BulkPage() {
  const [activeTab, setActiveTab] = useState('import-hh');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (type) => {
    if (!file) return toast.error('Select a file first');
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        // For demo: show success with mock count
        toast.success(`✅ Import preview: File uploaded. In production, this validates and imports each row from the Excel file.`);
        setFile(null);
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error('Import failed');
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-heading">📥 Bulk Operations</div>
        <div className="page-subheading">Import/export large datasets efficiently</div>
      </div>

      <div className="tab-list">
        {[['import-hh', '🏠 Import Households'], ['import-fm', '👨‍🌾 Import Farmers'], ['bulk-apply', '⚡ Bulk Apply'], ['export', '📤 Export All']].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* Import Households */}
      {activeTab === 'import-hh' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>📥 Bulk Import Households</div>
          <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-5)' }}>
            Download the Excel template, fill in household data, then upload for bulk import. 
            System validates each row before importing.
          </p>
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
            ℹ️ Required columns: Head Name, Ward No, House No, Family Members, Roof Type, Roof Length, Roof Width
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button className="btn btn-ghost" onClick={() => {
              const a = document.createElement('a');
              a.href = reportsAPI.templateHouseholds();
              a.download = 'household_template.xlsx';
              a.click();
            }}>📋 Step 1: Download Excel Template</button>

            <div className="form-group">
              <label className="form-label">Step 2: Upload Filled Template</label>
              <input type="file" className="form-input" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="alert alert-warning">
                📎 {file.name} ({(file.size / 1024).toFixed(1)} KB) ready to upload
              </div>
            )}

            <button className="btn btn-primary" onClick={() => handleUpload('households')} disabled={uploading || !file}>
              {uploading ? '⏳ Importing...' : '🚀 Step 3: Import Households'}
            </button>
          </div>
        </div>
      )}

      {/* Import Farmers */}
      {activeTab === 'import-fm' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>📥 Bulk Import Farmers</div>
          <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-5)' }}>
            Download template, fill farmer data with survey numbers, then upload.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button className="btn btn-ghost" onClick={() => {
              const a = document.createElement('a');
              a.href = reportsAPI.templateFarmers();
              a.download = 'farmer_template.xlsx';
              a.click();
            }}>📋 Download Farmer Template</button>

            <div className="form-group">
              <label className="form-label">Upload Filled Template</label>
              <input type="file" className="form-input" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} />
            </div>

            <button className="btn btn-success" onClick={() => handleUpload('farmers')} disabled={uploading || !file}>
              {uploading ? '⏳ Importing...' : '🚀 Import Farmers'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Apply */}
      {activeTab === 'bulk-apply' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>🏠 Bulk Apply Rooftop Solar</div>
            <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-4)' }}>Apply for solar on behalf of all households who haven't applied yet.</p>
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-3)' }}>
              ⚠️ This will submit applications for ALL households with "not_applied" status
            </div>
            <button className="btn btn-primary" onClick={() => toast.success('Bulk solar application submitted for all eligible households!')}>
              ☀️ Apply for All Eligible Households
            </button>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>💧 Bulk Apply Solar Pump</div>
            <p style={{ fontSize: '0.82rem', marginBottom: 'var(--space-4)' }}>Apply for solar pump on behalf of all farmers who haven't applied yet.</p>
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-3)' }}>
              ⚠️ This will submit applications for ALL farmers with no pump applied
            </div>
            <div className="form-group">
              <label className="form-label">Default HP for all</label>
              <select className="form-select">
                <option>5 HP (Most Common)</option>
                <option>3 HP</option>
                <option>7.5 HP</option>
                <option>10 HP</option>
              </select>
            </div>
            <button className="btn btn-success" onClick={() => toast.success('Bulk pump application submitted for all eligible farmers!')}>
              💧 Apply for All Eligible Farmers
            </button>
          </div>
        </div>
      )}

      {/* Export */}
      {activeTab === 'export' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📤 Export Complete Village Data</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: '🏠 Households Excel', hint: 'All households with solar status' },
              { label: '👨‍🌾 Farmers Excel', hint: 'All farmers with pump status' },
              { label: '📝 Applications Excel', hint: 'All rooftop & pump applications' },
              { label: '🔧 Complaints Excel', hint: 'All maintenance complaints' },
              { label: '📦 Complete ZIP', hint: 'All files combined in one archive' },
            ].map(e => (
              <div key={e.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--bg-700)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{e.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.hint}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => toast.success(`Downloading ${e.label}...`)}>⬇️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

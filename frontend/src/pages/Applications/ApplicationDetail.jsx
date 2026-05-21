// frontend/src/pages/Applications/ApplicationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsAPI } from '../../services/api';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsAPI.get(id).then(r => setData(r.data)).catch(() => navigate('/applications')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (!data) return null;

  const subsidyCentral = data.total_cost ? (data.total_cost * data.subsidy_central_pct / 100).toFixed(0) : 0;
  const subsidyState = data.total_cost ? (data.total_cost * data.subsidy_state_pct / 100).toFixed(0) : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/applications')} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>← Back</button>
          <div className="page-heading">📝 {data.application_id}</div>
          <div className="page-subheading">{data.type === 'rooftop' ? '🏠 Rooftop Solar' : '💧 Solar Pump'} Application</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>👤 Applicant Details</div>
          <table style={{ width: '100%' }}>
            <tbody>
              {[
                ['Applicant', data.household_name || data.farmer_name],
                ['Mobile', data.hh_mobile || data.farmer_mobile || '—'],
                ['Type', data.type === 'rooftop' ? '🏠 Rooftop Solar' : '💧 Solar Pump'],
                ['Status', data.status],
                ['Submitted', data.submitted_date ? new Date(data.submitted_date).toLocaleDateString('en-IN') : '—'],
                ['Site Visit', data.site_visit_date ? new Date(data.site_visit_date).toLocaleDateString('en-IN') : '—'],
                ['Approved', data.approval_date ? new Date(data.approval_date).toLocaleDateString('en-IN') : '—'],
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
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>💰 Subsidy Calculation</div>
          {data.total_cost ? (
            <div>
              {[
                { label: 'Total Project Cost', val: `₹${Number(data.total_cost).toLocaleString()}`, color: 'var(--text-primary)' },
                { label: `Central Govt (${data.subsidy_central_pct}%)`, val: `₹${Number(subsidyCentral).toLocaleString()}`, color: 'var(--emerald-light)' },
                { label: `State Govt (${data.subsidy_state_pct}%)`, val: `₹${Number(subsidyState).toLocaleString()}`, color: 'var(--sky)' },
                { label: 'Beneficiary Share', val: `₹${Number(data.beneficiary_contribution).toLocaleString()}`, color: 'var(--solar-gold)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.val}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,166,35,0.08)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Total subsidy: {parseInt(data.subsidy_central_pct) + parseInt(data.subsidy_state_pct)}% from Central + State Governments
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div>Cost details not entered yet</div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>📅 Status Timeline</div>
          <div className="timeline">
            {[
              { label: 'Application Submitted', date: data.submitted_date, done: true },
              { label: 'Site Visit / Survey', date: data.site_visit_date, done: !!data.site_visit_date },
              { label: 'Approved / Rejected', date: data.approval_date, done: ['approved','rejected','installed'].includes(data.status) },
              { label: 'Vendor Assigned', date: null, done: false },
              { label: 'Installation', date: data.installation_date, done: data.status === 'installed' },
            ].map(s => (
              <div key={s.label} className="timeline-item">
                <div className="timeline-dot" style={{ background: s.done ? 'var(--emerald-light)' : 'var(--border-medium)' }} />
                <div className="timeline-title" style={{ color: s.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</div>
                {s.date && <div className="timeline-date">{new Date(s.date).toLocaleDateString('en-IN')}</div>}
              </div>
            ))}
          </div>
        </div>

        {data.approval_comments && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>💬 Comments</div>
            <p>{data.approval_comments}</p>
            {data.rejection_reason && <div className="alert alert-error" style={{ marginTop: 12 }}>{data.rejection_reason}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

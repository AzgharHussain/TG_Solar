// frontend/src/pages/SHG/SHGPage.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { shgAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function SHGPage() {
  const { user } = useAuthStore();
  const [shgs, setSHGs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', registration_date: '', member_count: '', bank_account: '', bank_name: '', contact_name: '', contact_mobile: '' });

  const fetchSHGs = () => {
    shgAPI.list({ village_id: user?.village_id }).then(r => setSHGs(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  const fetchDetail = (id) => {
    shgAPI.get(id).then(r => setDetail(r.data)).catch(() => {});
  };

  useEffect(() => { fetchSHGs(); }, []);
  useEffect(() => { if (selected) fetchDetail(selected); }, [selected]);

  const handleCreate = async () => {
    try {
      await shgAPI.create(form);
      toast.success('SHG registered!');
      setShowModal(false);
      fetchSHGs();
    } catch { toast.error('Failed'); }
  };

  const totalCollections = detail?.collections?.reduce((s, c) => s + parseFloat(c.amount || 0), 0) || 0;
  const totalExpenses = detail?.expenses?.reduce((s, e) => s + parseFloat(e.amount || 0), 0) || 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-heading">👥 SHG & Community Management</div>
          <div className="page-subheading">Self Help Groups managing solar assets</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Register SHG</button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {/* SHG List */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            shgs.length === 0 ? (
              <div className="empty-state card" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No SHGs yet</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Add SHG</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {shgs.map(s => (
                  <div key={s.id} className="card" style={{ cursor: 'pointer', border: selected === s.id ? '1px solid var(--solar-gold)' : undefined }}
                    onClick={() => setSelected(s.id)}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.member_count} members • {s.shg_id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>📞 {s.contact_mobile}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* SHG Detail */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div className="empty-state card">
              <div className="empty-state-icon">👆</div>
              <div className="empty-state-title">Select an SHG to view details</div>
            </div>
          ) : !detail ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : (
            <div>
              <div className="grid grid-3" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="stat-card green">
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--emerald-light)' }}>₹{totalCollections.toLocaleString()}</div>
                  <div className="stat-label">Total Collections</div>
                </div>
                <div className="stat-card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444' }}>₹{totalExpenses.toLocaleString()}</div>
                  <div className="stat-label">Total Expenses</div>
                </div>
                <div className="stat-card gold">
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--solar-gold)' }}>₹{(totalCollections - totalExpenses).toLocaleString()}</div>
                  <div className="stat-label">Net Surplus</div>
                </div>
              </div>

              <div className="grid grid-2">
                {/* Collections */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div className="card-title">💰 Collections</div>
                    <button className="btn btn-success btn-sm" onClick={() => {
                      const amt = prompt('Collection amount (₹):');
                      const month = prompt('Month (e.g. Apr-2024):');
                      if (amt && month) shgAPI.addCollection(selected, { amount: amt, month_year: month, payment_method: 'cash' }).then(() => fetchDetail(selected));
                    }}>+ Add</button>
                  </div>
                  {detail.collections?.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No collections yet</div> :
                    detail.collections?.slice(0, 5).map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                        <span>{c.month_year}</span>
                        <span style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>₹{Number(c.amount).toLocaleString()}</span>
                      </div>
                    ))
                  }
                </div>

                {/* Expenses */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div className="card-title">💸 Expenses</div>
                    <button className="btn btn-danger btn-sm" onClick={() => {
                      const amt = prompt('Expense amount (₹):');
                      const desc = prompt('Description:');
                      if (amt && desc) shgAPI.addExpense(selected, { amount: amt, description: desc, category: 'O&M', expense_date: new Date().toISOString().split('T')[0] }).then(() => fetchDetail(selected));
                    }}>+ Add</button>
                  </div>
                  {detail.expenses?.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No expenses yet</div> :
                    detail.expenses?.slice(0, 5).map(e => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                        <span>{e.description}</span>
                        <span style={{ color: '#EF4444', fontWeight: 700 }}>₹{Number(e.amount).toLocaleString()}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">➕ Register SHG</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">SHG Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Date</label>
                  <input type="date" className="form-input" value={form.registration_date} onChange={e => setForm(f => ({ ...f, registration_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label">Member Count</label>
                  <input type="number" className="form-input" value={form.member_count} onChange={e => setForm(f => ({ ...f, member_count: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Mobile</label>
                  <input className="form-input" value={form.contact_mobile} onChange={e => setForm(f => ({ ...f, contact_mobile: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-input" value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>💾 Register SHG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

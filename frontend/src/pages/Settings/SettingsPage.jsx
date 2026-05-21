// frontend/src/pages/Settings/SettingsPage.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI, authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('village');
  const [village, setVillage] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', full_name: '', mobile: '', role: 'data_operator', password: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    Promise.all([
      settingsAPI.getVillage({ village_id: user?.village_id }).then(r => setVillage(r.data)),
      settingsAPI.getUsers().then(r => setUsers(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
    if (['state', 'admin'].includes(user?.role)) {
      settingsAPI.auditLogs().then(r => setAuditLogs(r.data)).catch(() => {});
    }
  }, [user]);

  const handleUpdateVillage = async () => {
    try {
      await settingsAPI.updateVillage(village);
      toast.success('Village profile updated!');
    } catch { toast.error('Failed'); }
  };

  const handleCreateUser = async () => {
    try {
      await settingsAPI.createUser(userForm);
      toast.success('User created!');
      setShowUserModal(false);
      settingsAPI.getUsers().then(r => setUsers(r.data));
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleToggleUser = async (id, is_active) => {
    try {
      await settingsAPI.updateUser(id, { is_active: !is_active });
      toast.success(`User ${is_active ? 'deactivated' : 'activated'}`);
      settingsAPI.getUsers().then(r => setUsers(r.data));
    } catch { toast.error('Failed'); }
  };

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) return toast.error('Passwords do not match');
    try {
      await authAPI.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed! Please login again.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;

  const tabs = [
    ['village', '🏘️ Village Profile'],
    ['users', '👤 User Management'],
    ['password', '🔑 Change Password'],
    ...(['state', 'admin'].includes(user?.role) ? [['audit', '📋 Audit Logs']] : []),
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-heading">⚙️ Settings & Configuration</div>
      </div>

      <div className="tab-list">
        {tabs.map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* Village Profile */}
      {activeTab === 'village' && village && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🏘️ Village Profile</div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Village Name</label>
              <input className="form-input" value={village.name || ''} onChange={e => setVillage(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Households</label>
              <input type="number" className="form-input" value={village.total_households || ''} onChange={e => setVillage(v => ({ ...v, total_households: e.target.value }))} />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Rooftop Target (HH)</label>
              <input type="number" className="form-input" value={village.rooftop_target || ''} onChange={e => setVillage(v => ({ ...v, rooftop_target: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Pump Target (Farmers)</label>
              <input type="number" className="form-input" value={village.pump_target || ''} onChange={e => setVillage(v => ({ ...v, pump_target: e.target.value }))} />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Land Plant Target (MW)</label>
              <input type="number" step="0.1" className="form-input" value={village.land_plant_target_mw || ''} onChange={e => setVillage(v => ({ ...v, land_plant_target_mw: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Population</label>
              <input type="number" className="form-input" value={village.population || ''} onChange={e => setVillage(v => ({ ...v, population: e.target.value }))} />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input type="number" step="any" className="form-input" value={village.latitude || ''} onChange={e => setVillage(v => ({ ...v, latitude: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input type="number" step="any" className="form-input" value={village.longitude || ''} onChange={e => setVillage(v => ({ ...v, longitude: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleUpdateVillage}>💾 Save Village Profile</button>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>➕ Add User</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Mobile</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td><code style={{ color: 'var(--solar-gold)', fontSize: '0.78rem' }}>{u.username}</code></td>
                    <td><span className="badge badge-applied" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.mobile || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-IN') : 'Never'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-installed' : 'badge-rejected'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className={`btn ${u.is_active ? 'btn-danger' : 'btn-success'} btn-sm`} onClick={() => handleToggleUser(u.id, u.is_active)}>
                        {u.is_active ? '🔒 Deactivate' : '🔓 Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Change Password */}
      {activeTab === 'password' && (
        <div className="card" style={{ maxWidth: 400 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>🔑 Change Password</div>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" value={pwForm.confirm_password} onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={handleChangePassword}>🔑 Change Password</button>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Time</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.full_name || l.username}</td>
                  <td><span className={`badge ${l.action.includes('delete') ? 'badge-rejected' : l.action.includes('create') ? 'badge-installed' : 'badge-applied'}`}>{l.action}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{l.entity_type}</td>
                  <td><code style={{ fontSize: '0.72rem', color: 'var(--sky)' }}>{l.entity_id}</code></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(l.created_at).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{l.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">➕ Create New User</div>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-input" value={userForm.mobile} onChange={e => setUserForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="data_operator">Data Operator</option>
                    <option value="field_officer">Field Officer</option>
                    <option value="sarpanch">Sarpanch</option>
                    <option value="mandal">MPDO</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Default: Admin@123" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateUser}>💾 Create User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

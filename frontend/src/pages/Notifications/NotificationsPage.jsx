// frontend/src/pages/Notifications/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { notificationsAPI, smsAPI } from '../../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [smsLogs, setSmsLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.list().then(r => { setNotifications(r.data || []); setUnread(r.unread_count || 0); }).catch(() => {}).finally(() => setLoading(false));
    smsAPI.logs({}).then(r => setSmsLogs(r.data || [])).catch(() => {});
  }, []);

  const markAllRead = async () => {
    try { await notificationsAPI.markAllRead(); setUnread(0); setNotifications(n => n.map(x => ({ ...x, is_read: true }))); toast.success('All marked as read'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-heading">🔔 Notifications & SMS</div>
          <div className="page-subheading">{unread} unread notifications</div>
        </div>
        {unread > 0 && <button className="btn btn-ghost" onClick={markAllRead}>✓ Mark All Read</button>}
      </div>

      <div className="tab-list">
        {[['notifications', `🔔 In-App (${unread})`], ['sms-logs', '📱 SMS Logs'], ['sms-send', '✉️ Send SMS']].map(([v, l]) => (
          <button key={v} className={`tab-item ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="card">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">No notifications</div>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)', opacity: n.is_read ? 0.6 : 1 }}
                  onClick={() => notificationsAPI.markRead(n.id)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--solar-gold)', flexShrink: 0, marginTop: 6 }} />
                  <div>
                    <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: '0.85rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SMS Logs */}
      {activeTab === 'sms-logs' && (
        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {smsLogs.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state" style={{ padding: 32 }}><div className="empty-state-title">No SMS sent yet</div></div></td></tr>
                ) : smsLogs.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace' }}>{s.recipient_mobile}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.message}</td>
                    <td><code style={{ fontSize: '0.72rem', color: 'var(--sky)' }}>{s.template_key}</code></td>
                    <td><span className={`badge ${s.status === 'sent' ? 'badge-installed' : 'badge-rejected'}`}>{s.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(s.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Send SMS */}
      {activeTab === 'sms-send' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>✉️ Send Manual SMS</div>
          <SendSMSForm />
        </div>
      )}
    </div>
  );
}

function SendSMSForm() {
  const [form, setForm] = useState({ mobile: '', message: '' });
  const handleSend = async () => {
    try {
      await smsAPI.send(form);
      toast.success('SMS sent!');
      setForm({ mobile: '', message: '' });
    } catch { toast.error('Failed to send SMS'); }
  };
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Recipient Mobile</label>
        <input className="form-input" placeholder="10-digit mobile number" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea className="form-textarea" placeholder="Type your message..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
        <div className="form-hint">{form.message.length} / 160 characters</div>
      </div>
      <button className="btn btn-primary" onClick={handleSend}>📱 Send SMS</button>
    </div>
  );
}

// frontend/src/components/Layout/AppShell.jsx
import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const NAV = {
  sarpanch: [
    { section: 'OVERVIEW', items: [
      { to: '/',          icon: '📊', label: 'Dashboard'      },
      { to: '/map',       icon: '🗺️', label: 'Village Map'    },
    ]},
    { section: 'MANAGEMENT', items: [
      { to: '/households', icon: '🏠', label: 'Households'     },
      { to: '/farmers',    icon: '🌾', label: 'Farmers'        },
      { to: '/land',       icon: '⚡', label: 'Land Solar Plant' },
    ]},
    { section: 'OPERATIONS', items: [
      { to: '/applications', icon: '📝', label: 'Applications'  },
      { to: '/shg',          icon: '👥', label: 'SHG Management' },
      { to: '/maintenance',  icon: '🔧', label: 'Maintenance'   },
    ]},
    { section: 'DATA', items: [
      { to: '/reports',       icon: '📈', label: 'Reports'         },
      // { to: '/bulk',          icon: '📥', label: 'Bulk Operations' },
      { to: '/notifications', icon: '🔔', label: 'Notifications'  },
      // { to: '/logs',          icon: '📋', label: 'Activity Logs'  },
    ]},
    { section: 'CONFIG', items: [
      { to: '/settings', icon: '⚙️', label: 'Settings' },
    ]},
  ],
  mandal: [
    { section: 'MANDAL', items: [
      { to: '/',              icon: '📊', label: 'Mandal Dashboard' },
      { to: '/applications',  icon: '📝', label: 'Applications'     },
      { to: '/notifications', icon: '🔔', label: 'Notifications'    },
    ]},
  ],
  district: [
    { section: 'DISTRICT', items: [
      { to: '/',              icon: '📊', label: 'District Dashboard' },
      { to: '/notifications', icon: '🔔', label: 'Notifications'     },
    ]},
  ],
  state: [
    { section: 'STATE', items: [
      { to: '/',              icon: '📊', label: 'State Dashboard'  },
      { to: '/notifications', icon: '🔔', label: 'Notifications'   },
      { to: '/settings',      icon: '⚙️', label: 'Settings'        },
    ]},
  ],
};

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navGroups = NAV[user?.role] || NAV.sarpanch;

  const getPageTitle = () => {
    const path = location.pathname;
    const titleMap = {
      '/':              'Dashboard',
      '/map':           'Village Map',
      '/households':    'Households',
      '/farmers':       'Farmers',
      '/land':          'Land Solar Plant',
      '/applications':  'Applications',
      '/logs':          'Activity Logs',
      '/shg':           'SHG Management',
      '/maintenance':   'Maintenance',
      '/reports':       'Reports & Analytics',
      '/bulk':          'Bulk Operations',
      '/notifications': 'Notifications',
      '/settings':      'Settings',
    };
    return titleMap[path] || titleMap[path.split('/')[1] ? '/' + path.split('/')[1] : '/'] || 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarLetter = user?.full_name?.[0]?.toUpperCase() || 'U';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-950)', fontFamily: 'var(--font-sans)' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-800)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-sans)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />

      {/* Ambient background */}
      <div className="app-bg" />

      {/* ── SIDEBAR ── */}
      <aside className="sidebar" style={{ width: collapsed ? 64 : 'var(--sidebar-w)', transition: 'width 250ms ease' }}>

        {/* Logo */}
        <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : undefined }}>
          <div className="sidebar-logo-icon" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
            ☀️
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">Surya Shakti</span>
              <span className="sidebar-logo-sub">TS Solar Platform</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.section}>
              {!collapsed && (
                <div className="nav-section-label">{group.section}</div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="nav-icon">{item.icon}</div>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-user-avatar">{avatarLetter}</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.full_name}</div>
                <div className="sidebar-user-role">{user?.role} · Logout</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── TOPBAR ── */}
      <header className="topbar" style={{ left: collapsed ? 64 : 'var(--sidebar-w)', transition: 'left 250ms ease' }}>

        {/* ── LEFT: Government Branding ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

          {/* Telangana State Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16, borderRight: '1px solid var(--border-medium)' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 50%, #1E3A8A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(29,78,216,0.3)',
              border: '2px solid rgba(29,78,216,0.4)',
            }}>🏛️</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.04em' }}>TELANGANA</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>STATE GOVERNMENT</div>
            </div>
          </div>

          {/* TSSPDCL Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, borderRight: '1px solid var(--border-medium)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
            }}>⚡</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--solar-gold)', letterSpacing: '0.02em' }}>TSSPDCL</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>POWER DISTRIBUTION</div>
            </div>
          </div>

          {/* TS Panchayat Raj Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
            }}>🌿</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--emerald-dark)', letterSpacing: '0.02em' }}>TS PANCHAYAT RAJ</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>& RURAL DEVELOPMENT</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: App Branding + Actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Page title chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)', padding: '4px 12px 4px 8px',
          }}>
            <span style={{ fontSize: '0.85rem' }}>☀️</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>/</span>
            <span className="topbar-breadcrumb-current">{getPageTitle()}</span>
          </div>

          {/* Surya Shakti TS branding */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingLeft: 16, borderLeft: '1px solid var(--border-medium)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--solar-gold) 0%, var(--solar-amber) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: 'var(--glow-gold)',
            }}>☀️</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Surya Shakti TS
              </div>
              <div style={{ fontSize: '0.58rem', color: 'var(--solar-gold)', fontWeight: 600, letterSpacing: '0.06em' }}>
                TS SOLAR MISSION PLATFORM
              </div>
            </div>
          </div>

          {/* Location chip */}
          <div className="topbar-village">
            <div className="village-dot" />
            <span>{user?.village_name || user?.mandal_name || user?.district_name || 'Administration'}</span>
          </div>

          {/* Notifications */}
          <button className="topbar-icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
            🔔
            <span className="topbar-badge">3</span>
          </button>

          {/* Fullscreen */}
          <button className="topbar-icon-btn" onClick={() => document.documentElement.requestFullscreen?.()} title="Full Screen">
            ⛶
          </button>
        </div>
      </header>


      {/* ── MAIN ── */}
      <main
        className="main-content"
        style={{ marginLeft: collapsed ? 64 : 'var(--sidebar-w)', transition: 'margin-left 250ms ease' }}
      >
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

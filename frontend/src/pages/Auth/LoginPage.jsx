// frontend/src/pages/Auth/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import tsLogo from '../../images/STATE-TELANGANA-LOGO.png';
import gisfyLogo from '../../images/Image.png';

const ROLES = [
  { value: 'sarpanch', label: 'Sarpanch', sub: 'Village Level', icon: '🏘️' },
  { value: 'mandal',   label: 'MPDO',     sub: 'Mandal Level',  icon: '🏢' },
  { value: 'district', label: 'Collector', sub: 'District Level', icon: '🏛️' },
  { value: 'state',    label: 'State Admin', sub: 'State Level', icon: '🗺️' },
];

const DEMO = [
  { role: 'Sarpanch', user: 'sarpanch_ram',    pass: 'Admin@123', color: '#F5A623' },
  { role: 'MPDO',     user: 'mpdo_siddipet',   pass: 'Admin@123', color: '#38BDF8' },
  { role: 'Collector',user: 'collector_siddipet', pass: 'Admin@123', color: '#8B5CF6' },
  { role: 'State',    user: 'state_admin',      pass: 'Admin@123', color: '#10B981' },
];

const LANGS = ['English', 'తెలుగు', 'हिंदी'];  // Telugu is official language of TS

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [lang, setLang]           = useState(0);
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [role, setRole]           = useState('sarpanch');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Enter credentials');
    setLoading(true);
    try {
      const res = await authAPI.login({ username, password });
      login(res.token, res.user);
      toast.success(`Welcome, ${res.user.full_name}! 🌞`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.user);
    setPassword(cred.pass);
    toast.success(`Demo: ${cred.role} credentials filled`);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-950)',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ══ GOVERNMENT HEADER BAR ══════════════════════════════════════ */}
      <div style={{
        width: '100%', height: 98,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-medium)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        flexShrink: 0, zIndex: 10,
      }}>
        {/* ── Left: Govt Logos ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        <img src={tsLogo} alt="Telangana State Logo" style={{ width: 160, height: 80 }} />
        </div>

        {/* ── Right: Surya Shakti AP ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(135deg, #F5A623 0%, #FF8C00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', boxShadow: '0 0 20px rgba(245,166,35,0.4)',
          }}>☀️</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.2rem',
              fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em',
            }}>Surya Shakti TS</div>
            <div style={{ fontSize: '0.9rem', color: '#F5A623', fontWeight: 700, letterSpacing: '0.07em' }}>
              TELANGANA SOLAR MISSION
            </div>
          </div>
        </div>
      </div>

      {/* ══ TWO-PANEL BODY ═══════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: '0 0 52%',
        background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 40%, #ffffffff 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '40px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0', right: '-100px', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '30%', width: '300px', height: '300px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 40 }}>
          {/* Big sun icon */}
          <div style={{
            fontSize: '5rem', marginBottom: 28, lineHeight: 1,
            filter: 'drop-shadow(0 0 30px rgba(245,166,35,0.5))',
            animation: 'float 4s ease-in-out infinite',
          }}>☀️</div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.4rem', fontWeight: 800,
            color: '#7f9ceeff', lineHeight: 1.15, marginBottom: 16,
            letterSpacing: '-0.03em',
          }}>
            100% Solar Village<br/>
            <span style={{ background: 'linear-gradient(90deg, #F5A623, #FFD580)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Mission Telangana
            </span>
          </h1>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 380, marginBottom: 40 }}>
            Comprehensive solar asset management platform for every household, farmer and gram panchayat across Telangana under TSSPDCL.
          </p>

          {/* Feature tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🏠', title: 'Rooftop Solar', desc: 'Every household' },
              { icon: '💧', title: 'Solar Pumps', desc: 'TS-KUSUM scheme' },
              { icon: '⚡', title: '2MW Land Plant', desc: 'Village energy hub' },
              { icon: '📊', title: 'Live Analytics', desc: 'District to State' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '14px 16px',
                transition: 'all 200ms ease',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,166,35,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700,  color: '#7f9ceeff', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
       
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        position: 'relative',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          animation: 'slide-up 400ms cubic-bezier(0.34,1.56,0.64,1) both',
        }}>

          {/* Language switcher
          <div style={{ display: 'flex', gap: 6, marginBottom: 32, justifyContent: 'flex-end' }}>
            {LANGS.map((l, i) => (
              <button key={i} onClick={() => setLang(i)} style={{
                padding: '6px 14px',
                borderRadius: 20, border: '1px solid',
                borderColor: lang === i ? 'var(--solar-gold)' : 'var(--border-medium)',
                background: lang === i ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.03)',
                color: lang === i ? 'var(--solar-gold)' : 'var(--text-muted)',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 200ms ease',
              }}>{l}</button>
            ))}
          </div> */}

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Welcome Back
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sign in to access your solar management dashboard</p>
          </div>

          {/* Role selector */}
          {/* <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Login As</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)} style={{
                  padding: '10px 12px',
                  borderRadius: 10, border: '1px solid',
                  borderColor: role === r.value ? 'rgba(245,166,35,0.4)' : 'var(--border-subtle)',
                  background: role === r.value ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 200ms ease',
                }}>
                  <div style={{ fontSize: '1rem', marginBottom: 2 }}>{r.icon}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: role === r.value ? 'var(--solar-gold)' : 'var(--text-secondary)' }}>{r.label}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>{r.sub}</div>
                </button>
              ))}
            </div>
          </div> */}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Username</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${username ? 'rgba(245,166,35,0.3)' : 'var(--border-medium)'}`,
                borderRadius: 10, padding: '10px 16px',
                transition: 'all 200ms ease',
              }}>
                <span style={{ fontSize: '1rem' }}>👤</span>
                <input
                  type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  autoComplete="username"
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Password</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${password ? 'rgba(245,166,35,0.3)' : 'var(--border-medium)'}`,
                borderRadius: 10, padding: '10px 16px',
                transition: 'all 200ms ease',
              }}>
                <span style={{ fontSize: '1rem' }}>🔑</span>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 0 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? 'rgba(245,166,35,0.4)' : 'linear-gradient(135deg, #F5A623 0%, #FF8C00 100%)',
              border: 'none', borderRadius: 12,
              color: '#1a0f00', fontWeight: 800, fontSize: '0.9rem',
              letterSpacing: '0.02em', cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 24px rgba(245,166,35,0.35)',
              transition: 'all 200ms ease', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = '0 6px 30px rgba(245,166,35,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(245,166,35,0.35)')}>
              {loading ? '⏳ Signing in...' : '☀️ Sign In to Dashboard'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 28, padding: 16,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Quick Access — Demo Credentials
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DEMO.map(d => (
                <button key={d.role} onClick={() => fillDemo(d)} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `rgba(${d.color === '#F5A623' ? '245,166,35' : d.color === '#38BDF8' ? '56,189,248' : d.color === '#8B5CF6' ? '139,92,246' : '16,185,129'},0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: d.color, marginBottom: 1 }}>{d.role}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.user}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>
              Click any card → All passwords: <code style={{ color: 'var(--solar-gold)' }}>Admin@123</code>
            </div>
          </div>
 
        </div>
        <div style={{
          position: 'fixed', bottom: 16, right: 20, zIndex: 100,
          fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20, padding: '5px 14px',
          letterSpacing: '0.04em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: '0.75rem' }}>⚙️</span> Powered by <img src={gisfyLogo} alt="gisfy" style={{ width: '120px', height: '30px' }} />
        </div>
      </div>
      </div>{/* end two-panel body */}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>

  );
}

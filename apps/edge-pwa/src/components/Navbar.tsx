import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useHandoff } from '../context/HandoffContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { resetFlow } = useHandoff();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `vc-nav-link${isActive ? ' active' : ''}`;

  return (
    <header className={`vc-navbar${scrolled ? ' shadow-md' : ''}`} style={{ boxShadow: scrolled ? '0 4px 12px rgba(0,0,0,.08)' : undefined }}>
      <div className="vc-nav-inner">
        {/* Logo */}
        <button
          onClick={() => { resetFlow(); navigate('/verify'); }}
          className="flex items-center gap-2.5 flex-shrink-0"
          aria-label="VeritasChain home"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm select-none">
            VC
          </div>
          <span style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: 17, color: 'var(--vc-text-primary)', letterSpacing: '-0.01em' }}>
            VeritasChain
          </span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Primary navigation">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/verify" className={linkClass} onClick={resetFlow}>Verify</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
          <NavLink to="/docs" className={linkClass}>Documentation</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <button 
            className="vc-btn vc-btn-primary" 
            style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            onClick={() => { resetFlow(); navigate('/verify'); }}
          >
            Start Verification →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors ml-auto"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4l10 10M14 4L4 14" /></svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 5h14M2 9h14M2 13h14" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {[['/', 'Home'], ['/verify', 'Verify'], ['/history', 'History'], ['/docs', 'Documentation'], ['/about', 'About']].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`
              }
              onClick={() => {
                if (to === '/verify') resetFlow();
                setMobileOpen(false);
              }}
            >
              {label}
            </NavLink>
          ))}
          <button 
            className="vc-btn vc-btn-primary vc-btn-full mt-2"
            onClick={() => {
              resetFlow();
              setMobileOpen(false);
              navigate('/verify');
            }}
          >
            Start Verification →
          </button>
        </div>
      )}
    </header>
  );
}

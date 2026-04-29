import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Verify Shipment', to: '/verify' },
        { label: 'History', to: '/history' },
        { label: 'Documentation', to: '/docs' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'API Reference', to: '/docs' },
        { label: 'Whitepaper', to: '/docs' },
        { label: 'GitHub', href: 'https://github.com' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Hackathon 2024', href: '#' },
        { label: 'Contact', href: 'mailto:hello@veritaschain.io' },
      ],
    },
  ];

  return (
    <footer className="vc-footer">
      <div className="vc-container" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 48 }}>
          {/* Brand col */}
          <div style={{ gridColumn: 'span 1' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm select-none">VC</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '-0.01em' }}>VeritasChain</span>
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65, maxWidth: 220 }}>
              Tamper-proof cold chain provenance. Every handoff verified with zero-knowledge proofs.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {['twitter', 'github', 'discord'].map((s) => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center" aria-label={s}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {s === 'twitter' ? '𝕏' : s === 'github' ? '⌗' : '◇'}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 16 }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {'href' in link ? (
                      <a href={link.href} className="vc-footer-link" target={link.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{link.label}</a>
                    ) : (
                      <Link to={link.to!} className="vc-footer-link">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 48, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#475569' }}>© {year} VeritasChain. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((t) => (
              <a key={t} href="#" style={{ fontSize: 13, color: '#475569', transition: 'color .2s' }} className="hover:text-gray-300">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

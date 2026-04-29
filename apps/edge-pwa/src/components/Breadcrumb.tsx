import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="vc-breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-6px" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className="vc-breadcrumb-sep">/</span>}
            {isLast || !item.to ? (
              <span className={isLast ? 'vc-breadcrumb-current' : 'vc-breadcrumb-item'}>{item.label}</span>
            ) : (
              <Link to={item.to} className="vc-breadcrumb-item hover:text-slate-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  to?: string;
  label: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export default function Breadcrumbs({ items = [] }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      {items.map((it, idx) => (
        <div key={idx}>
          {idx > 0 && <span className="opacity-50">/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-gray-900">{it.label}</Link>
          ) : (
            <span className="text-gray-900">{it.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}



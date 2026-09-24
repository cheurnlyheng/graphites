import Link from 'next/link';

const tiles = [
  { href: '/admin/products', label: 'Manage products', hint: 'Add, edit, and stock your catalog' },
  { href: '/admin/orders', label: 'Fulfillment queue', hint: 'See what needs to ship' },
  { href: '/admin/returns', label: 'Returns', hint: 'Approve, receive, refund' },
  { href: '/admin/purchase-orders', label: 'Restock alerts', hint: 'Low stock + draft purchase orders' },
  { href: '/admin/suppliers', label: 'Suppliers', hint: 'Who restocks what' }
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="page-heading mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card block p-6 transition-colors hover:border-accent">
            <p className="font-medium text-ink">{t.label}</p>
            <p className="mt-1 text-sm text-ink/50">{t.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

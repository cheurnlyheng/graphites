interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  PAID: { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' },
  FULFILLED: { label: 'Fulfilled', className: 'bg-blue-500/10 text-blue-800 border-blue-500/20' },
  LABEL_PURCHASED: { label: 'Packing', className: 'bg-sky-500/10 text-sky-800 border-sky-500/20' },
  SHIPPED: { label: 'Shipped', className: 'bg-indigo-500/10 text-indigo-800 border-indigo-500/20' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
  REFUNDED: { label: 'Refunded', className: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20' },
  REQUESTED: { label: 'Requested', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
  RECEIVED: { label: 'Received', className: 'bg-blue-500/10 text-blue-800 border-blue-500/20' },
  DRAFT: { label: 'Draft', className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' },
  SENT: { label: 'Sent', className: 'bg-blue-500/10 text-blue-800 border-blue-500/20' },
  ACTIVE: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' },
  ARCHIVED: { label: 'Archived', className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans shadow-2xs ${config.className}`}
    >
      {config.label}
    </span>
  );
}

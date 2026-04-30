import Link from "next/link";

interface TripSummaryCardProps {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  planned: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function TripSummaryCard({
  id,
  title,
  start_date,
  end_date,
  status,
  created_at,
  updated_at,
}: TripSummaryCardProps) {
  const statusClass = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="rounded-2xl bg-card shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
          {title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass}`}
        >
          {status}
        </span>
      </div>

      {(start_date || end_date) && (
        <p className="text-sm text-muted-foreground">
          {start_date ?? "—"} → {end_date ?? "—"}
        </p>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Updated {updated_at}</p>
        <p>Created {created_at}</p>
      </div>

      <Link
        href={`/trips/${id}`}
        className="mt-auto inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start"
      >
        Open trip
      </Link>
    </div>
  );
}

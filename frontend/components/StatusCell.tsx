"use client";

import StatusBadge from "@/components/StatusBadge";

type StatusCellProps = {
  status: string;
  action?: React.ReactNode;
};

/**
 * Status column cell with badge + optional action link.
 * Uses flexbox for consistent alignment: [ Status Badge ] [ Action ]
 */
export default function StatusCell({ status, action }: StatusCellProps) {
  return (
    <div className="flex min-w-[180px] items-center justify-between gap-3 py-1">
      <StatusBadge status={status} />
      {action != null && <span className="shrink-0">{action}</span>}
    </div>
  );
}

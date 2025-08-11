type BadgeProps = {
  priority: "low" | "medium" | "high";
};

const PRIORITY_COLORS = {
  low: "bg-blue-500/20 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/20 text-red-500 border-red-500/20",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const Badge = ({ priority }: BadgeProps) => {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_COLORS[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
};

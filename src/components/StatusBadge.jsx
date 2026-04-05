const STATUS_CONFIG = {
  new: { emoji: "🟡", label: "신규", bg: "bg-yellow-500/20", text: "text-yellow-400" },
  existing: { emoji: "🟢", label: "기존", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  duplicate: { emoji: "🔴", label: "중복", bg: "bg-red-500/20", text: "text-red-400" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.emoji} {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
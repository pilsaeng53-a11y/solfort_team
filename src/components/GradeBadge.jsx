const GRADE_CONFIG = {
  GREEN: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", commission: "10%" },
  PURPLE: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", commission: "30%" },
  GOLD: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", commission: "40%" },
  PLATINUM: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", commission: "50%+" },
};

export default function GradeBadge({ grade = "GREEN", showCommission = false }) {
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.GREEN;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {grade}
      {showCommission && <span className="opacity-70">({config.commission})</span>}
    </span>
  );
}

export { GRADE_CONFIG };
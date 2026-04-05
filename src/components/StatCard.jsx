export default function StatCard({ label, value, sub, icon }) {
  return (
    <div className="sf-card rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {icon && (
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
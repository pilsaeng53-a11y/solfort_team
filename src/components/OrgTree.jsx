import { useState } from "react";

function RoleBadge({ role }) {
  const map = {
    leader: { label: "팀장", cls: "bg-purple-500/20 text-purple-400" },
    call_admin: { label: "지사장", cls: "bg-blue-500/20 text-blue-400" },
    member: { label: "팀원", cls: "bg-emerald-500/20 text-emerald-400" },
    dealer: { label: "대리점", cls: "bg-yellow-500/20 text-yellow-400" },
    manager: { label: "매니저", cls: "bg-orange-500/20 text-orange-400" },
  };
  const cfg = map[role] || { label: role || "멤버", cls: "bg-white/10 text-gray-400" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.cls}`}>{cfg.label}</span>
  );
}

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-800/40 bg-[#0d1a12] cursor-pointer hover:bg-emerald-900/20 transition-all select-none`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren ? (
          <span className="text-emerald-500 text-[10px] w-3 shrink-0">{open ? "▼" : "▶"}</span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <RoleBadge role={node.role} />
        <span className="text-white text-sm font-medium">{node.name}</span>
        {node.phone && <span className="text-gray-500 text-xs ml-auto">{node.phone}</span>}
      </div>

      {hasChildren && open && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-800/30 pl-3">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgTree({ data = [], title }) {
  return (
    <div>
      {title && <p className="text-xs font-semibold text-gray-400 mb-3">{title}</p>}
      <div className="space-y-1">
        {data.map(node => (
          <TreeNode key={node.id} node={node} />
        ))}
        {data.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-6">데이터 없음</p>
        )}
      </div>
    </div>
  );
}
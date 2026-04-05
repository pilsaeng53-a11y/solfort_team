import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function WalletDisplay({ label, address }) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const short = address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-gray-300 font-mono mt-0.5">{short}</p>
      </div>
      <button
        onClick={handleCopy}
        className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-gray-400" />}
      </button>
    </div>
  );
}
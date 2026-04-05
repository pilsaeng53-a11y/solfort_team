export default function SFCard({ children, className = "", glow = false }) {
  return (
    <div className={`relative sf-card rounded-2xl p-4 ${className}`}>
      {glow && (
        <div className="absolute -inset-1 bg-blue-500/5 rounded-2xl blur-xl -z-10" />
      )}
      {children}
    </div>
  );
}
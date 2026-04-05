export default function SFLogo({ size = "md" }) {
  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl",
  };

  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20`}>
      SF
    </div>
  );
}
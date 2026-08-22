export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-6 py-3 rounded-lg font-semibold tracking-wide transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
  const variants = {
    primary: "bg-brass text-ink hover:bg-brass-dim hover:text-parchment",
    ghost: "bg-transparent border border-steel text-parchment hover:border-brass hover:text-brass",
    danger: "bg-barber text-parchment hover:opacity-90"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

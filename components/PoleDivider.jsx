export default function PoleDivider({ animate = false, className = "" }) {
  return (
    <div
      className={`pole-stripe-thin w-full ${animate ? "animate-stripe" : ""} ${className}`}
      role="presentation"
    />
  );
}

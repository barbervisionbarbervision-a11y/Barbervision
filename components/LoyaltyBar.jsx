export default function LoyaltyBar({ atual, meta = 10 }) {
  const pct = Math.min(100, Math.round((atual / meta) * 100));
  const completo = atual >= meta;

  return (
    <div>
      <div className="flex justify-between text-sm text-steel mb-1">
        <span>{atual} de {meta} cortes</span>
        {completo && <span className="text-brass font-semibold">Benefício liberado 🎉</span>}
      </div>
      <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${completo ? "bg-brass" : "bg-barber"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

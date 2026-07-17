export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden bg-ink text-ivory border-y border-white/10">
      <div className="flex gap-12 py-3 animate-[marquee_28s_linear_infinite] whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="eyebrow text-ivory/70 flex items-center gap-12">
            <span className="text-gold">✦</span> {t}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

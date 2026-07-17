const messages = [
  "Free worldwide shipping over $75",
  "Dispatched within 24h from our atelier",
  "30-day easy returns · Secure checkout",
  "New: Winter weave Shemaghs — limited run",
];

export function AnnouncementBar() {
  const loop = [...messages, ...messages];
  return (
    <div className="bg-ink text-ivory overflow-hidden border-b border-white/10">
      <div className="flex whitespace-nowrap animate-marquee py-2">
        {loop.map((m, i) => (
          <span key={i} className="eyebrow px-6 text-ivory/90">
            <span className="text-gold mr-2">✦</span>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

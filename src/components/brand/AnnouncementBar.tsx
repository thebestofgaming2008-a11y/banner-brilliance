const messages = [
  "India shipping included in product prices",
  "International orders confirmed on WhatsApp",
  "Secure Razorpay checkout for India",
  "Customer accounts, wishlists, and order tracking",
];

export function AnnouncementBar() {
  const loop = [...messages, ...messages];
  return (
    <div className="bg-ink text-ivory overflow-hidden border-b border-white/10">
      <div className="flex whitespace-nowrap animate-marquee py-2">
        {loop.map((message, index) => (
          <span key={`${message}-${index}`} className="eyebrow px-6 text-ivory/90">
            <span className="text-gold mr-2">*</span>
            {message}
          </span>
        ))}
      </div>
    </div>
  );
}

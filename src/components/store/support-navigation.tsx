export function InformationHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="brand-mango-bg px-[22px] py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-[1000px]">
        <nav
          aria-label="Breadcrumb"
          className="mb-7 flex flex-wrap items-center gap-2 text-[12px] text-black/75"
        >
          <a href="/" className="underline underline-offset-4">
            Home
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <p className="section-kicker text-black/75">{eyebrow}</p>
        <h1 className="section-heading mt-3 max-w-3xl text-[36px] leading-[1.05] md:text-[54px]">
          {title}
        </h1>
        {intro ? (
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-black/80">{intro}</p>
        ) : null}
      </div>
    </header>
  );
}

export function SupportNavigation() {
  return (
    <nav aria-label="Customer support pages" className="mt-12 rounded-lg bg-[#F7F7F5] p-6 md:p-7">
      <h2 className="text-[18px] font-semibold">More help from Fawzaan Store</h2>
      <p className="mt-2 text-[14px] leading-6 text-black/65">
        Find the details you need before ordering, or get help with an existing order.
      </p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4 text-[13px] font-medium">
        {[
          ["/pages/contact", "Contact support"],
          ["/pages/shipping", "Shipping"],
          ["/pages/returns", "Returns"],
          ["/faq", "FAQs"],
          ["/about", "About the store"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="underline underline-offset-4 hover:text-[#A84624]">
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

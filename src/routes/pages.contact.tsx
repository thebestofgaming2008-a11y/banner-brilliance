import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { StorePage } from "@/components/store/store-chrome";
import { useStoreReveal } from "@/hooks/use-store-reveal";
import { STORE_WHATSAPP_DISPLAY, whatsappUrl } from "@/lib/store-config";

export const Route = createFileRoute("/pages/contact")({ component: ContactPage });

function ContactPage() {
  useStoreReveal();
  const [sent, setSent] = useState(false);
  return (
    <StorePage>
      <section className="bg-[#f4b400] px-[22px] py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1000px]" data-store-reveal>
          <p className="section-kicker text-black/55">Customer care</p>
          <h1 className="section-heading mt-3 text-[44px] md:text-[68px]">CONTACT US</h1>
          <p className="mt-5 max-w-xl text-[14px] leading-6 text-black/65">
            Questions about a product, delivery, or an existing order? Send us a message.
          </p>
        </div>
      </section>
      <section className="px-[22px] py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1000px] gap-12 md:grid-cols-[0.7fr_1.3fr]">
          <aside data-store-reveal>
            <h2 className="text-[20px] font-bold uppercase">We are here to help</h2>
            <div className="mt-7 space-y-5">
              <div className="flex gap-3">
                <MessageCircle size={19} />
                <div>
                  <p className="text-[12px] font-semibold">WhatsApp support</p>
                  <a
                    href={whatsappUrl("Assalamu alaikum. I need help with Fawzaan Store.")}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-[13px] text-black/55 underline underline-offset-4"
                  >
                    {STORE_WHATSAPP_DISPLAY}
                  </a>
                </div>
              </div>
            </div>
          </aside>
          <div data-store-reveal>
            {sent ? (
              <div className="border border-black/10 p-8">
                <p className="section-kicker text-black/45">Message received</p>
                <h2 className="section-heading mt-3 text-[34px]">THANK YOU</h2>
                <p className="mt-4 text-[14px] text-black/60">
                  WhatsApp opened with your message. Press Send there to contact support.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 text-[11px] font-bold uppercase underline"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const message = [
                    "Assalamu alaikum. I need help with Fawzaan Store.",
                    "",
                    `Name: ${String(form.get("name") ?? "")}`,
                    `Email: ${String(form.get("email") ?? "")}`,
                    form.get("orderNumber")
                      ? `Order number: ${String(form.get("orderNumber"))}`
                      : "",
                    "",
                    String(form.get("message") ?? ""),
                  ]
                    .filter(Boolean)
                    .join("\n");
                  const supportWindow = window.open(
                    whatsappUrl(message),
                    "_blank",
                    "noopener,noreferrer",
                  );
                  if (!supportWindow) window.location.href = whatsappUrl(message);
                  setSent(true);
                }}
                className="grid gap-5"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="text-[11px] font-bold uppercase">
                    Name
                    <input
                      name="name"
                      required
                      className="mt-2 h-12 w-full border border-black/20 px-3 text-[14px] font-normal outline-none focus:border-black"
                    />
                  </label>
                  <label className="text-[11px] font-bold uppercase">
                    Email
                    <input
                      name="email"
                      required
                      type="email"
                      className="mt-2 h-12 w-full border border-black/20 px-3 text-[14px] font-normal outline-none focus:border-black"
                    />
                  </label>
                </div>
                <label className="text-[11px] font-bold uppercase">
                  Order number <span className="text-black/35">Optional</span>
                  <input
                    name="orderNumber"
                    className="mt-2 h-12 w-full border border-black/20 px-3 text-[14px] font-normal outline-none focus:border-black"
                  />
                </label>
                <label className="text-[11px] font-bold uppercase">
                  Message
                  <textarea
                    name="message"
                    required
                    rows={7}
                    className="mt-2 w-full resize-none border border-black/20 p-3 text-[14px] font-normal outline-none focus:border-black"
                  />
                </label>
                <button type="submit" className="h-12 bg-[#f4b400] text-[11px] font-bold uppercase">
                  Open WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </StorePage>
  );
}

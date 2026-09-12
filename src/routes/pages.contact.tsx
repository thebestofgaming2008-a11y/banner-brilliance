import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, MessageCircle } from "lucide-react";

import { StorePage } from "@/components/store/store-chrome";
import { InformationHeader, SupportNavigation } from "@/components/store/support-navigation";
import {
  STORE_INSTAGRAM_HANDLE,
  STORE_INSTAGRAM_URL,
  STORE_LOCATION,
  STORE_SUPPORT_EMAIL,
  STORE_WHATSAPP_DISPLAY,
  STORE_WHATSAPP_INQUIRY_MESSAGE,
  whatsappUrl,
} from "@/lib/store-config";
import { infoSeo } from "@/lib/info-seo";

export const Route = createFileRoute("/pages/contact")({
  head: () =>
    infoSeo({
      title: "Contact Fawzaan Store | Customer Support",
      description:
        "Contact Fawzaan Store in Mumbai by WhatsApp or email for help with products, sizing, delivery, returns and existing orders.",
      path: "/pages/contact",
      label: "Contact us",
      type: "ContactPage",
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <StorePage>
      <InformationHeader
        eyebrow="Customer care"
        title="Contact us"
        intro="Questions about a product or an order? Contact Fawzaan Store on WhatsApp or by email. Include your order number if you have one."
      />
      <section className="px-[22px] py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1000px] gap-12 md:grid-cols-[0.7fr_1.3fr]">
          <aside className="self-start rounded-lg bg-[#F7F7F5] p-6">
            <h2 className="text-[22px] font-semibold">Speak to the store</h2>
            <div className="mt-7 space-y-5">
              <div className="flex gap-3">
                <MessageCircle size={19} />
                <div>
                  <p className="text-[12px] font-semibold">WhatsApp support</p>
                  <a
                    href={whatsappUrl(STORE_WHATSAPP_INQUIRY_MESSAGE)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-[13px] text-black/75 underline underline-offset-4"
                  >
                    {STORE_WHATSAPP_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <Instagram size={19} />
                <div>
                  <p className="text-[12px] font-semibold">Instagram</p>
                  <a
                    href={STORE_INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-[13px] text-black/55 underline underline-offset-4"
                  >
                    {STORE_INSTAGRAM_HANDLE}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail size={19} />
                <div>
                  <p className="text-[12px] font-semibold">Email</p>
                  <a
                    href={`mailto:${STORE_SUPPORT_EMAIL}`}
                    className="mt-1 block text-[13px] text-black/55 underline underline-offset-4"
                  >
                    {STORE_SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin size={19} />
                <div>
                  <p className="text-[12px] font-semibold">Store location</p>
                  <p className="mt-1 text-[13px] leading-5 text-black/55">{STORE_LOCATION}</p>
                </div>
              </div>
            </div>
          </aside>
          <div>
            <h2 className="text-[22px] font-semibold">Prepare a WhatsApp message</h2>
            <p id="contact-form-help" className="mt-3 mb-6 text-[14px] leading-6 text-black/70">
              Fill in your details below. WhatsApp will open with your message ready to review;
              press Send there to contact us.
            </p>
            <form
              aria-describedby="contact-form-help"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const message = [
                  STORE_WHATSAPP_INQUIRY_MESSAGE,
                  "",
                  `Name: ${String(form.get("name") ?? "")}`,
                  `Email: ${String(form.get("email") ?? "")}`,
                  form.get("orderNumber") ? `Order number: ${String(form.get("orderNumber"))}` : "",
                  "",
                  String(form.get("message") ?? ""),
                ]
                  .filter(Boolean)
                  .join("\n");
                window.location.assign(whatsappUrl(message));
              }}
              className="grid gap-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-[11px] font-bold uppercase">
                  Name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    className="mt-2 h-12 w-full border border-black/20 px-3 text-[14px] font-normal outline-none focus:border-black"
                  />
                </label>
                <label className="text-[11px] font-bold uppercase">
                  Email
                  <input
                    name="email"
                    autoComplete="email"
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
              <button type="submit" className="brand-mango-bg h-12 text-[11px] font-bold uppercase">
                Continue to WhatsApp
              </button>
              <p className="text-[12px] leading-5 text-black/65">
                Prefer email?{" "}
                <a className="underline underline-offset-4" href={`mailto:${STORE_SUPPORT_EMAIL}`}>
                  Email customer support
                </a>
                . Read our{" "}
                <a className="underline underline-offset-4" href="/pages/privacy">
                  privacy policy
                </a>{" "}
                before sharing personal information.
              </p>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-[1000px]">
          <SupportNavigation />
        </div>
      </section>
    </StorePage>
  );
}

export const STORE_WHATSAPP_DISPLAY = "+91 91529 99764";
export const STORE_WHATSAPP_PHONE = String(
  import.meta.env.VITE_WHATSAPP_ORDER_PHONE || "919152999764",
).replace(/\D/g, "");

export function whatsappUrl(message: string) {
  return `https://wa.me/${STORE_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

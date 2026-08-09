export const STORE_LOGO_URL = "/fawzaan-logo-640.png";
export const STORE_WHATSAPP_DISPLAY = "+91 91529 99764";
export const STORE_SUPPORT_EMAIL = "faizk4511@gmail.com";
export const STORE_INSTAGRAM_HANDLE = "@fawzaan.store";
export const STORE_INSTAGRAM_URL = "https://www.instagram.com/fawzaan.store/";
export const STORE_LOCATION = "Kurla West, Mumbai, Maharashtra 400070";
export const STORE_WHATSAPP_INQUIRY_MESSAGE =
  "السلام عليكم ورحمة الله وبركاته\nI want to inquire about something related to Fawzaan Store.";
export const STORE_WHATSAPP_PHONE = String(
  import.meta.env.VITE_WHATSAPP_ORDER_PHONE || "919152999764",
).replace(/\D/g, "");

export function whatsappUrl(message: string) {
  return `https://wa.me/${STORE_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

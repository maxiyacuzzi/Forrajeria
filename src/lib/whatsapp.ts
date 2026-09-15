/** wa.me click-to-chat link: opens with the message pre-filled but not sent. */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "")
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

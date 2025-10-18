export function displayPhone(phone?: string, phoneCode?: string) {
  const p = (phone ?? "").trim();
  if (!p) return "";
  if (p.startsWith("+")) return p;        // already E.164
  const code = (phoneCode ?? "").trim();
  return code ? `${code}${p}` : p;
}

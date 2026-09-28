export function newId(): string {
  // randomUUID only exists in secure contexts; plain-http LAN testing lacks it.
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

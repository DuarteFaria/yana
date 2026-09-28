import { useEffect, useState } from "react";

export type Daypart = "dawn" | "day" | "golden" | "night";

export function daypartFor(d = new Date()): Daypart {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5.5 && h < 8) return "dawn";
  if (h >= 8 && h < 17.5) return "day";
  if (h >= 17.5 && h < 20.5) return "golden";
  return "night";
}

/** Current time, ticking every `ms`; also mirrors the daypart onto <html>. */
export function useClock(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  const part = daypartFor(now);
  useEffect(() => {
    document.documentElement.dataset.daypart = part;
  }, [part]);
  return { now, part };
}

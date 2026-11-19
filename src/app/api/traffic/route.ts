import { z } from "zod";

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const schema = z.object({ from: lngLat, to: lngLat });

// a light per-visitor limit, so the TomTom quota can't be drained from one browser (per server instance)
const WINDOW = 60_000;
const MAX = 10;
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX;
}

/** The drive time right now, with live traffic (TomTom). The page falls back to the plain route time when this fails. */
export async function POST(req: Request) {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return Response.json({ error: "Traffic is not set up." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return Response.json({ error: "Too many requests." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { from, to } = parsed.data;

  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/${from[1]},${from[0]}:${to[1]},${to[0]}/json` +
    `?key=${encodeURIComponent(key)}&traffic=true&travelMode=car&departAt=now&routeType=fastest`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return Response.json({ error: "No traffic data." }, { status: 502 });
    const s = (await res.json())?.routes?.[0]?.summary;
    if (typeof s?.travelTimeInSeconds !== "number") return Response.json({ error: "No traffic data." }, { status: 502 });
    return Response.json({
      duration: s.travelTimeInSeconds, // with today's traffic
      delay: Math.max(0, s.trafficDelayInSeconds ?? 0), // what the traffic adds
      distance: s.lengthInMeters,
    });
  } catch {
    return Response.json({ error: "No traffic data." }, { status: 502 });
  }
}

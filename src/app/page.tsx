import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Weather from "@/components/Weather";

export const metadata: Metadata = {
  title: "Weather",
  description: "Live weather for your current city.",
};

// Vercel adds the visitor's location to every request; these headers are absent in local dev.
async function LocalWeather() {
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  const city = h.get("x-vercel-ip-city");
  const initial =
    city && lat && lon
      ? { name: decodeURIComponent(city), country: h.get("x-vercel-ip-country") ?? undefined, latitude: lat, longitude: lon }
      : undefined;
  return <Weather initial={initial} />;
}

export default function WeatherPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-950" />}>
      <LocalWeather />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";

type Place = { name: string; country?: string; latitude: number; longitude: number };
type Forecast = {
  current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
};

// WMO weather codes, grouped: [label, icon, background gradient]
const look = (c: number): [string, string, string] =>
  c === 0 ? ["Clear sky", "☀️", "from-sky-400 via-blue-500 to-indigo-700"]
  : c <= 3 ? ["Partly cloudy", "⛅", "from-slate-400 via-sky-600 to-slate-800"]
  : c <= 48 ? ["Fog", "🌫️", "from-slate-500 via-slate-600 to-slate-800"]
  : c <= 57 ? ["Drizzle", "🌦️", "from-slate-500 via-blue-700 to-slate-900"]
  : c <= 67 ? ["Rain", "🌧️", "from-slate-600 via-blue-800 to-slate-950"]
  : c <= 77 ? ["Snow", "❄️", "from-slate-300 via-sky-500 to-slate-700"]
  : c <= 82 ? ["Rain showers", "🌧️", "from-slate-600 via-blue-800 to-slate-950"]
  : c <= 86 ? ["Snow showers", "🌨️", "from-slate-300 via-sky-500 to-slate-700"]
  : ["Thunderstorm", "⛈️", "from-slate-700 via-purple-900 to-black"];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

const glass = "rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md";

export default function Weather({ initial }: { initial?: Place }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [data, setData] = useState<Forecast | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async (p: Place) => {
    setError("");
    try {
      setData(
        await getJson<Forecast>(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}` +
            `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
        ),
      );
      setPlace(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weather");
    }
  };

  // Vercel supplies `initial`; without it (local dev) fall back to an IP lookup.
  // shortcut: ipapi.co is rate limited and city-level only, swap for navigator.geolocation if precision matters.
  useEffect(() => {
    if (initial) return void load(initial);
    getJson<{ city: string; country_name: string; latitude: number; longitude: number }>("https://ipapi.co/json/")
      .then((g) => load({ name: g.city, country: g.country_name, latitude: g.latitude, longitude: g.longitude }))
      .catch(() => setError("Could not detect your city. Search for one above."));
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const r = await getJson<{ results?: Place[] }>(
        `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(query.trim())}`,
      );
      if (!r.results?.[0]) return setError(`No city found for "${query}"`);
      load(r.results[0]);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  const [label, icon, bg] = look(data?.current.weather_code ?? 0);
  const details = data && [
    ["Feels like", `${Math.round(data.current.apparent_temperature)}°`],
    ["Humidity", `${data.current.relative_humidity_2m}%`],
    ["Wind", `${Math.round(data.current.wind_speed_10m)} km/h`],
  ];
  const lo = data ? Math.min(...data.daily.temperature_2m_min) : 0;
  const span = data ? Math.max(...data.daily.temperature_2m_max) - lo || 1 : 1;

  return (
    <main className={`min-h-screen bg-gradient-to-br px-5 py-10 text-white transition-colors duration-700 ${data ? bg : "from-slate-700 to-slate-950"}`}>
      <div className="mx-auto max-w-2xl space-y-6">
        <form onSubmit={search} className={`${glass} flex items-center gap-2 p-2 pl-5`}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a city"
            aria-label="City"
            className="flex-1 bg-transparent py-2 outline-none placeholder:text-white/60"
          />
          <button className="rounded-2xl bg-white/20 px-5 py-2 text-sm font-medium transition hover:bg-white/30">Search</button>
        </form>

        {error && <p className={`${glass} px-5 py-3 text-red-100`}>{error}</p>}
        {!data && !error && (
          <p className="py-20 text-center text-white/70">Detecting your city…</p>
        )}

        {data && place && details && (
          <>
            <section className={`${glass} p-8 text-center`}>
              <p className="text-lg font-medium tracking-wide">
                {place.name}{place.country ? `, ${place.country}` : ""}
              </p>
              <p className="my-2 text-8xl drop-shadow-lg" aria-hidden>{icon}</p>
              <p className="text-8xl font-thin tracking-tighter md:text-9xl">{Math.round(data.current.temperature_2m)}°</p>
              <p className="mt-2 text-xl text-white/80">{label}</p>
              <p className="mt-1 text-sm text-white/60">
                H {Math.round(data.daily.temperature_2m_max[0])}° · L {Math.round(data.daily.temperature_2m_min[0])}°
              </p>
            </section>

            <section className="grid grid-cols-3 gap-3">
              {details.map(([k, v]) => (
                <div key={k} className={`${glass} p-4 text-center`}>
                  <p className="text-xs uppercase tracking-widest text-white/60">{k}</p>
                  <p className="mt-1 text-xl font-medium">{v}</p>
                </div>
              ))}
            </section>

            <section className={`${glass} divide-y divide-white/10 px-6`}>
              {data.daily.time.slice(1, 6).map((d, i) => {
                const max = data.daily.temperature_2m_max[i + 1];
                const min = data.daily.temperature_2m_min[i + 1];
                return (
                  <div key={d} className="flex items-center gap-4 py-4">
                    <p className="w-12 font-medium">{new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "short" })}</p>
                    <p className="w-8 text-2xl" title={look(data.daily.weather_code[i + 1])[0]}>{look(data.daily.weather_code[i + 1])[1]}</p>
                    <p className="w-9 text-right text-white/60">{Math.round(min)}°</p>
                    <div className="relative h-1.5 flex-1 rounded-full bg-white/20">
                      <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-sky-200 to-amber-300"
                        style={{ left: `${((min - lo) / span) * 100}%`, width: `${((max - min) / span) * 100}%` }}
                      />
                    </div>
                    <p className="w-9">{Math.round(max)}°</p>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

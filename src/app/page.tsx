"use client";

import { Wrench, CheckSquare, Settings, LogOut, Navigation, PlaneTakeoff, ShieldAlert, Cloud, Sunrise, Sunset, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAppStore } from "@/hooks/useAppStore";
import { getClosestBase, haversineDistance } from "@/lib/locationUtils";
import { useEffect, useState } from "react";
import SunCalc from "suncalc";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const currentBase = useAppStore((state) => state.currentBase);
  const setBase = useAppStore((state) => state.setBase);
  const weather = useAppStore((state) => state.weather);
  const updateInspectionState = useAppStore((state) => state.updateInspectionState);
  const [gpsStatus, setGpsStatus] = useState("Detectando ubicación...");
  const [userName, setUserName] = useState("Inspector");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const namePart = user.email.split('@')[0];
        const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        setUserName(capitalizedName);
        updateInspectionState({ inspectorName: capitalizedName });
      }
    };
    fetchUser();
    
    const fetchWeather = async (lat: number, lng: number, baseId?: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto`);
        if (!res.ok) throw new Error("Weather API Failed");
        const data = await res.json();
        
        const wmoCodes: Record<number, string> = {
          0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
          45: "Niebla", 48: "Niebla escarcha", 51: "Llovizna ligera", 53: "Llovizna moderada",
          55: "Llovizna densa", 61: "Lluvia leve", 63: "Lluvia moderada", 65: "Lluvia fuerte",
          71: "Nieve leve", 73: "Nieve moderada", 75: "Nieve fuerte", 95: "Tormenta"
        };
        const code = data.current?.weather_code || 0;
        const conditions = wmoCodes[code] || "Desconocido";
        
        const sunriseRaw = data.daily?.sunrise?.[0] || "";
        const sunsetRaw = data.daily?.sunset?.[0] || "";
        const formatTime = (iso: string) => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : "N/A";

        if (baseId) setBase(baseId);

        updateInspectionState({
          location: { lat, lng },
          weather: { 
            temp: `${data.current?.temperature_2m || "N/A"}°C`, 
            conditions, 
            sunrise: formatTime(sunriseRaw), 
            sunset: formatTime(sunsetRaw) 
          }
        });
      } catch (err) {
        console.error("Open-Meteo Error:", err);
        if (baseId) setBase(baseId);
        updateInspectionState({ location: { lat, lng }, weather: { temp: "N/A", conditions: "Clima Inaccesible", sunrise: "N/A", sunset: "N/A" } });
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const closest = getClosestBase({ lat, lng });
          setGpsStatus("Base y clima detectados por GPS.");
          fetchWeather(lat, lng, closest.id);
        },
        (err) => {
          console.warn("GPS denegado o timeout:", err.message);
          setGpsStatus("GPS no disponible. Usando base predeterminada.");
          // Default to Don Torcuato coords if GPS fails, so weather still shows SADF/Don Torcuato area
          fetchWeather(-34.4828, -58.6183, "dontorcuato");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsStatus("GPS no soportado.");
      fetchWeather(-34.4828, -58.6183, "dontorcuato");
    }
  }, [setBase, updateInspectionState]);
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50 p-4 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <PlaneTakeoff className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Flight Express S.A.
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wider">MECÁNICO DE TURNO</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <LogOut className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-8 z-10">
        
        {/* Welcome Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold mb-2">Bienvenido, {userName}</h2>
            <p className="text-gray-400">¿Qué inspeccionamos hoy?</p>
          </motion.div>
        </section>

        {/* Base Selection (Mock for now) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Base Selection */}
          <div className="glass-dark rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Navigation className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Navigation className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Base Actual</h3>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 hidden lg:block">
                {gpsStatus}
              </span>
            </div>
            <div className="relative z-10">
              <select 
                value={currentBase}
                onChange={(e) => setBase(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg"
              >
                <option value="baires">Helipuerto Baires Núñez</option>
                <option value="dontorcuato">Helipuerto Modena Don Torcuato</option>
                <option value="rosario">Helipuerto UTV Rosario</option>
                <option value="neuquen">Helipuerto Neuquén</option>
                <option value="sierragrande">Helipuerto Sierra Grande</option>
                <option value="cabovirgenes">Base BRM Cabo Vírgenes</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-2 lg:hidden">{gpsStatus}</p>
            </div>
          </div>

          {/* Weather Widget */}
          <div className="glass-dark rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Cloud className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-white">Meteorología</h3>
            </div>
            
            {weather ? (
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Clima</p>
                  <p className="text-2xl font-bold text-white mb-1">{weather.temp}</p>
                  <p className="text-sm text-gray-300 truncate">{weather.conditions}</p>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col justify-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Sunrise className="w-4 h-4 text-orange-400" /> {weather.sunrise}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Sunset className="w-4 h-4 text-indigo-400" /> {weather.sunset}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black/30 rounded-xl border border-white/5 relative z-10 min-h-[100px]">
                <p className="text-sm text-gray-400 animate-pulse">Consultando Clima...</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Actions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard 
            href="/inspection"
            icon={<CheckSquare className="w-8 h-8" />}
            title="Inspección Diaria"
            description="Aeronaves, instalaciones y depósitos."
            color="from-blue-600 to-blue-400"
            delay={0.2}
          />
          <ActionCard 
            href="/inspection"
            icon={<ShieldAlert className="w-8 h-8" />}
            title="Reporte de Novedades"
            description="Registrar anomalías con STT y fotos."
            color="from-red-600 to-red-400"
            delay={0.3}
          />
          <ActionCard 
            href="#"
            icon={<Settings className="w-8 h-8" />}
            title="Configuración"
            description="Ajustes de la aplicación y red."
            color="from-gray-600 to-gray-400"
            delay={0.4}
          />
        </section>

      </main>
    </div>
  );
}

function ActionCard({ href, icon, title, description, color, delay }: { href: string, icon: React.ReactNode, title: string, description: string, color: string, delay: number }) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="glass-dark rounded-2xl p-6 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group h-full flex flex-col"
      >
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-lg shadow-black/20 group-hover:shadow-black/40 transition-shadow`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed flex-1">
          {description}
        </p>
      </motion.div>
    </Link>
  );
}

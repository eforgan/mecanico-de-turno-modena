"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Search, Calendar, MapPin, AudioLines, Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Mock data to demonstrate the UI
const MOCK_REPORTS = [
  {
    id: "1",
    date: "10 Oct 2026",
    base: "Helipuerto Baires Núñez",
    inspector: "J. Pérez",
    fuelStatus: "apto",
    noveltiesCount: 0,
    status: "REVIEWED"
  },
  {
    id: "2",
    date: "10 Oct 2026",
    base: "Helipuerto Modena Don Torcuato",
    inspector: "M. Gómez",
    fuelStatus: "no apto",
    noveltiesCount: 3,
    status: "SUBMITTED"
  },
  {
    id: "3",
    date: "09 Oct 2026",
    base: "Base BRM Cabo Vírgenes",
    inspector: "L. Silva",
    fuelStatus: "apto",
    noveltiesCount: 1,
    status: "SUBMITTED"
  }
];

export default function AdminDashboard() {
  const [filter, setFilter] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Fallback to Mock if no DB
        setReports(MOCK_REPORTS);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('inspection_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map DB columns to UI state
        const mapped = data.map(r => ({
          id: r.id,
          date: new Date(r.created_at).toLocaleDateString('es-AR'),
          base: r.base_name,
          inspector: r.inspector_id ? 'ID: ' + r.inspector_id.substring(0,6) : 'Mecánico',
          fuelStatus: r.fuel_status,
          noveltiesCount: r.novelties_count,
          status: r.status
        }));
        setReports(mapped);
      } else {
        console.error("Error fetching reports:", error);
        setReports(MOCK_REPORTS); // Fallback on error
      }
      setLoading(false);
    }
    
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filter === "all") return true;
    if (filter === "issues") return r.fuelStatus === "no apto" || r.noveltiesCount > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-xs text-gray-400">Modena - Central de Reportes</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6 z-10">
        
        {/* Filters */}
        <div className="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por base o inspector..." 
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter("issues")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "issues" ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:bg-white/5'}`}
            >
              Con Novedades
            </button>
          </div>
        </div>

        {/* Report List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p>Cargando reportes desde la central...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-gray-400">
              No se encontraron reportes con los filtros actuales.
            </div>
          ) : (
            filteredReports.map((report) => (
            <div key={report.id} className="glass-dark rounded-xl p-5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer">
              
              <div className="flex flex-col gap-1 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{report.base}</span>
                  {report.status === "SUBMITTED" ? (
                    <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pendiente</span>
                  ) : (
                    <span className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Revisado</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {report.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.inspector}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">Combustible</span>
                  {report.fuelStatus === "apto" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 animate-pulse" />
                  )}
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">Novedades</span>
                  {report.noveltiesCount > 0 ? (
                    <span className="bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg flex items-center gap-2">
                      {report.noveltiesCount} <AudioLines className="w-4 h-4" /> <ImageIcon className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm font-bold">Ninguna</span>
                  )}
                </div>

                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors hidden md:block">
                  Ver Detalles
                </button>
              </div>

            </div>
          )))}
        </div>
      </main>
    </div>
  );
}

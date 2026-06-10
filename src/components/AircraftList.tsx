import { useAppStore, AircraftRecord } from "@/hooks/useAppStore";
import { Plus, Trash2, Plane } from "lucide-react";

export function AircraftList() {
  const verifiedAircraft = useAppStore((state) => state.verifiedAircraft);
  const updateInspectionState = useAppStore((state) => state.updateInspectionState);

  const addAircraft = () => {
    const newAircraft: AircraftRecord = {
      id: Math.random().toString(36).substr(2, 9),
      brand: "",
      model: "",
      registration: "",
      tg: "",
      status: "EN SERVICIO",
      novelties: ""
    };
    updateInspectionState({ verifiedAircraft: [...verifiedAircraft, newAircraft] });
  };

  const updateAircraft = (id: string, field: keyof AircraftRecord, value: string) => {
    const updated = verifiedAircraft.map((a) => a.id === id ? { ...a, [field]: value } : a);
    updateInspectionState({ verifiedAircraft: updated });
  };

  const removeAircraft = (id: string) => {
    updateInspectionState({ verifiedAircraft: verifiedAircraft.filter((a) => a.id !== id) });
  };

  return (
    <section className="glass-dark rounded-2xl p-6 border border-white/5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Plane className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Aeronaves Verificadas</h2>
        </div>
        <button onClick={addAircraft} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      <div className="space-y-6">
        {verifiedAircraft.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No hay aeronaves agregadas. Presione "Agregar" para registrar una inspección.</p>
        ) : (
          verifiedAircraft.map((aircraft, index) => (
            <div key={aircraft.id} className="bg-black/40 border border-white/5 rounded-xl p-4 relative">
              <div className="absolute top-4 right-4">
                <button onClick={() => removeAircraft(aircraft.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <h4 className="text-white font-medium mb-4">Aeronave #{index + 1}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Marca</label>
                  <input type="text" value={aircraft.brand} onChange={(e) => updateAircraft(aircraft.id, 'brand', e.target.value)} placeholder="Ej: Airbus" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Modelo</label>
                  <input type="text" value={aircraft.model} onChange={(e) => updateAircraft(aircraft.id, 'model', e.target.value)} placeholder="Ej: H125" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Matrícula</label>
                  <input type="text" value={aircraft.registration} onChange={(e) => updateAircraft(aircraft.id, 'registration', e.target.value)} placeholder="Ej: LV-FQN" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">TG (Tiempo General)</label>
                  <input type="text" value={aircraft.tg} onChange={(e) => updateAircraft(aircraft.id, 'tg', e.target.value)} placeholder="Ej: 1540.5 hs" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Estado Operativo</label>
                  <select value={aircraft.status} onChange={(e) => updateAircraft(aircraft.id, 'status', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500">
                    <option value="EN SERVICIO">🟢 EN SERVICIO</option>
                    <option value="FUERA DE SERVICIO">🔴 FUERA DE SERVICIO</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Novedades / Observaciones</label>
                <textarea value={aircraft.novelties} onChange={(e) => updateAircraft(aircraft.id, 'novelties', e.target.value)} placeholder="Describa fallas, mantenimientos o estado general..." rows={3} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

import { useAppStore, FuelDepositRecord } from "@/hooks/useAppStore";
import { Plus, Trash2, Droplet, Camera } from "lucide-react";
import { useRef } from "react";

export function FuelDepositsList() {
  const fuelDeposits = useAppStore((state) => state.fuelDeposits);
  const updateInspectionState = useAppStore((state) => state.updateInspectionState);

  const addDeposit = () => {
    const newDeposit: FuelDepositRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: "",
      amount: "",
      testResult: "",
      testNotes: ""
    };
    updateInspectionState({ fuelDeposits: [...fuelDeposits, newDeposit] });
  };

  const updateDeposit = (id: string, field: keyof FuelDepositRecord, value: string) => {
    const updated = fuelDeposits.map((d) => d.id === id ? { ...d, [field]: value } : d);
    updateInspectionState({ fuelDeposits: updated });
  };

  const removeDeposit = (id: string) => {
    updateInspectionState({ fuelDeposits: fuelDeposits.filter((d) => d.id !== id) });
  };

  const handlePhotoCapture = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDeposit(id, 'photoBase64', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="glass-dark rounded-2xl p-6 border border-white/5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Droplet className="w-5 h-5 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Cisternas y Combustible</h2>
        </div>
        <button onClick={addDeposit} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      <div className="space-y-6">
        {fuelDeposits.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No hay cisternas/depósitos registrados.</p>
        ) : (
          fuelDeposits.map((deposit, index) => (
            <div key={deposit.id} className="bg-black/40 border border-white/5 rounded-xl p-4 relative">
              <div className="absolute top-4 right-4">
                <button onClick={() => removeDeposit(deposit.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <h4 className="text-white font-medium mb-4">Depósito #{index + 1}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de Depósito</label>
                  <input type="text" value={deposit.type} onChange={(e) => updateDeposit(deposit.id, 'type', e.target.value)} placeholder="Ej: Cisterna Móvil, Tanque Subterráneo" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cantidad de Combustible</label>
                  <input type="text" value={deposit.amount} onChange={(e) => updateDeposit(deposit.id, 'amount', e.target.value)} placeholder="Ej: 5000 Lts" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Pruebas de Contaminación</label>
                  <select value={deposit.testResult} onChange={(e) => updateDeposit(deposit.id, 'testResult', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">Seleccione resultado...</option>
                    <option value="APROBADO">✔️ APROBADO (Libre de agua/sedimentos)</option>
                    <option value="RECHAZADO">❌ RECHAZADO (Contaminado)</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  {deposit.photoBase64 ? (
                    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/50 h-10 flex items-center justify-center">
                       <span className="text-xs text-green-400 font-medium">Foto Guardada</span>
                       <button onClick={() => updateDeposit(deposit.id, 'photoBase64', '')} className="absolute inset-0 bg-red-500/80 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">Eliminar Foto</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg p-2.5 flex items-center justify-center gap-2 text-sm text-gray-300 transition-colors">
                      <Camera className="w-4 h-4" /> Tomar Foto del Frasco
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoCapture(deposit.id, e)} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observaciones</label>
                <input type="text" value={deposit.testNotes} onChange={(e) => updateDeposit(deposit.id, 'testNotes', e.target.value)} placeholder="Color del combustible, nivel de agua drena, etc..." className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

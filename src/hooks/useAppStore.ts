import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AircraftRecord {
  id: string;
  brand: string;
  model: string;
  registration: string;
  tg: string;
  status: 'EN SERVICIO' | 'FUERA DE SERVICIO';
  novelties: string;
}

export interface FuelDepositRecord {
  id: string;
  type: string;
  amount: string;
  testResult: 'APROBADO' | 'RECHAZADO' | '';
  testNotes: string;
  photoBase64?: string;
}

export interface InspectionState {
  currentBase: string;
  currentAircraft: string;
  // Campos recurrentes pre-llenados
  inspectorName: string;
  fuelLevel: string;
  location: { lat: number; lng: number } | null;
  weather: { temp: string; conditions: string; sunrise: string; sunset: string } | null;
  verifiedAircraft: AircraftRecord[];
  fuelDeposits: FuelDepositRecord[];
}

interface AppStore extends InspectionState {
  setBase: (base: string) => void;
  setAircraft: (aircraft: string) => void;
  updateInspectionState: (partialState: Partial<InspectionState>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentBase: 'baires', // Default inicial
      currentAircraft: '',
      inspectorName: '',
      fuelLevel: '',
      location: null,
      weather: null,
      verifiedAircraft: [],
      fuelDeposits: [],

      setBase: (base) => set({ currentBase: base }),
      setAircraft: (aircraft) => set({ currentAircraft: aircraft }),
      updateInspectionState: (partialState) => set((state) => ({ ...state, ...partialState })),
    }),
    {
      name: 'modena-app-storage', // Clave única para localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

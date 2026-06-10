"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/hooks/useAppStore";
import { Mic, MicOff, Camera, MapPin, Cloud, Send, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import SunCalc from "suncalc";
import { haversineDistance, getClosestBase } from "@/lib/locationUtils";
import { AircraftList } from "@/components/AircraftList";
import { FuelDepositsList } from "@/components/FuelDepositsList";

const MOCK_CHECKLIST = [
  { id: 1, category: "Hangares e Instalaciones", question: "Estado general de limpieza y orden en hangares" },
  { id: 2, category: "Sistemas de Apoyo", question: "Niveles de fluidos auxiliares y grupos electrógenos operativos" },
  { id: 3, category: "Seguridad", question: "Matafuegos y sistemas de alarma accesibles y en regla" },
  { id: 4, category: "Plataforma", question: "Estado de la plataforma y señalización correcta" }
];

export default function InspectionPage() {
  const { currentBase, inspectorName, updateInspectionState, location, weather, verifiedAircraft, fuelDeposits } = useAppStore();
  
  const [items, setItems] = useState<Record<number, boolean | null>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");

  // Fuel Test State
  const [fuelStatus, setFuelStatus] = useState<'apto' | 'no apto' | null>(null);
  const [fuelPhoto, setFuelPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comentarios de Actividad State
  const [activityComment, setActivityComment] = useState("");
  const [activityAudioBase64, setActivityAudioBase64] = useState<string | null>(null);
  const [isRecordingActivity, setIsRecordingActivity] = useState(false);
  const activityMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activityAudioChunksRef = useRef<BlobPart[]>([]);
  
  // Novedades State (Multiple items with Audio and Photos)
  type Novelty = { id: number; category: string; text: string; photoUrl: string | null; audioBase64: string | null };
  const [novelties, setNovelties] = useState<Novelty[]>([]);
  const [currentNoveltyText, setCurrentNoveltyText] = useState("");
  const [currentCategory, setCurrentCategory] = useState("Herramientas");
  // Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const fuelFileInputRef = useRef<HTMLInputElement>(null);
  const noveltyFileInputRef = useRef<HTMLInputElement>(null);

  const NOVELTY_CATEGORIES = [
    "Herramientas", "Equipos de apoyo", "Carros y ruedas de transporte", 
    "Prevención de incendios", "Estado del helipuerto", "Plataformas", 
    "Depósitos y estanterías", "Instalaciones", "Otras"
  ];

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "es-AR";

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };
    }

    // Set current date and time
    const now = new Date();
    setDateStr(now.toLocaleDateString('es-AR'));
    setTimeStr(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // Add novelty item
          setNovelties((prev) => [...prev, {
            id: Date.now(),
            category: currentCategory,
            text: currentNoveltyText,
            photoUrl: null,
            audioBase64: base64Audio
          }]);
          setCurrentNoveltyText(""); // reset
        };
      };

      mediaRecorderRef.current.start();
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Error accediendo al micrófono.");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const toggleActivityRecording = async () => {
    if (isRecordingActivity) {
      recognitionRef.current?.stop();
      if (activityMediaRecorderRef.current && activityMediaRecorderRef.current.state !== "inactive") {
        activityMediaRecorderRef.current.stop();
        activityMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecordingActivity(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activityMediaRecorderRef.current = new MediaRecorder(stream);
        activityAudioChunksRef.current = [];

        activityMediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) activityAudioChunksRef.current.push(e.data);
        };

        activityMediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(activityAudioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            setActivityAudioBase64(reader.result as string);
          };
        };

        if (recognitionRef.current) {
          recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
              }
            }
            if (finalTranscript) {
              setActivityComment((prev) => prev + finalTranscript);
            }
          };
          activityMediaRecorderRef.current.start();
          recognitionRef.current.start();
          setIsRecordingActivity(true);
        } else {
          alert("STT no soportado en este navegador.");
        }
      } catch (err) {
        console.error("Mic error:", err);
        alert("Error accediendo al micrófono.");
      }
    }
  };

  const handleNoveltyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, noveltyId: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setNovelties(prev => prev.map(n => n.id === noveltyId ? { ...n, photoUrl: base64 } : n));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemToggle = (id: number, status: boolean) => {
    setItems((prev) => ({ ...prev, [id]: status }));
  };

  const handleFuelPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Read as Data URL (base64) so it can be sent via JSON payload
      const reader = new FileReader();
      reader.onloadend = () => {
        setFuelPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        base: currentBase,
        inspector: inspectorName,
        dateStr,
        timeStr,
        location,
        weather,
        verifiedAircraft,
        fuelDeposits,
        activityComment: transcript,
        activityAudioBase64: activityAudioBase64,
        novelties,
        fuelStatus,
        fuelPhoto,
        items: Object.entries(items).map(([id, val]) => ({
          id,
          passed: val,
          question: MOCK_CHECKLIST.find(i => i.id.toString() === id)?.question || ""
        }))
      };

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Reporte enviado con éxito a eforgan@gruppomodena.com');
        // Reset form or redirect
      } else {
        alert('Hubo un error al enviar el reporte. Revisar consola.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden pb-24">
      {/* Header */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50 p-4 shadow-lg shadow-black/5 flex items-center justify-between">
        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </Link>
        <h1 className="text-lg font-bold text-white">Inspección Diaria</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col gap-8 z-10">
        
        {/* Context Info */}
        <div className="glass rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Base:</span>
            <span className="text-white font-medium capitalize">{currentBase || 'No seleccionada'}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-400">Fecha y Hora:</span>
            <span className="text-white font-medium">{dateStr} {timeStr}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-1.5 rounded-lg border border-blue-500/20">
              <MapPin className="w-3.5 h-3.5" />
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Obteniendo GPS...'}
            </div>
            {weather && (
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1.5 rounded-lg border border-blue-500/20">
                <Cloud className="w-3.5 h-3.5" />
                <span>{weather.temp}</span>
                <span className="text-gray-500">|</span>
                <span>{weather.conditions}</span>
                <span className="text-gray-500">|</span>
                <span className="text-yellow-500">☀ {weather.sunrise} - {weather.sunset}</span>
              </div>
            )}
          </div>
        </div>

        <AircraftList />

        <FuelDepositsList />

        {/* Dynamic Checklist (Hangares y Apoyo) */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-white">Checklist (ANAC / BARS)</h2>
          <div className="flex flex-col gap-3">
            {MOCK_CHECKLIST.map((item) => (
              <div key={item.id} className="glass-dark rounded-xl p-4 flex items-center justify-between gap-4 border border-white/5">
                <div className="flex-1">
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">{item.category}</span>
                  <p className="text-gray-200 text-sm mt-1">{item.question}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleItemToggle(item.id, true)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${items[item.id] === true ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleItemToggle(item.id, false)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${items[item.id] === false ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Drenaje de Combustible */}
        <section className="mt-2">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            Prueba de Contaminación (Combustible)
          </h2>
          <div className="glass-dark rounded-xl p-5 border border-white/5 flex flex-col gap-5">
            <p className="text-sm text-gray-300">
              Drenaje de tanques de la aeronave y depósito en base. Verifique ausencia de agua y partículas.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setFuelStatus('apto')}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${fuelStatus === 'apto' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <CheckCircle2 className="w-5 h-5" />
                APTO
              </button>
              <button 
                onClick={() => setFuelStatus('no apto')}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${fuelStatus === 'no apto' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <XCircle className="w-5 h-5" />
                NO APTO
              </button>
            </div>

            <div className="border-t border-white/10 pt-4">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fuelFileInputRef}
                className="hidden" 
                onChange={handleFuelPhotoUpload}
              />
              {!fuelPhoto ? (
                <button 
                  onClick={() => fuelFileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-6 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors text-gray-400"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Tomar foto del recipiente transparente</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/10 h-48 bg-black/50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fuelPhoto} alt="Muestra de combustible" className="object-contain h-full w-full" />
                  <button 
                    onClick={() => setFuelPhoto(null)}
                    className="absolute top-2 right-2 bg-red-600/90 text-white p-2 rounded-full hover:bg-red-500 shadow-lg backdrop-blur"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Novedades y Comentarios de Actividad */}
        <section className="mt-2">
          <h2 className="text-xl font-semibold mb-4 text-white">Comentarios de Actividad</h2>
          <div className="glass-dark rounded-xl p-4 border border-white/5 flex flex-col gap-4">
            <p className="text-sm text-gray-300">
              Ingrese cualquier novedad o comentario general relacionado con la actividad del turno.
            </p>
            <textarea 
              value={activityComment}
              onChange={(e) => setActivityComment(e.target.value)}
              placeholder="Presione 'Dictar STT' para grabar su voz..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {activityAudioBase64 && (
              <div className="flex items-center gap-2 text-sm text-green-400 mt-[-8px]">
                <CheckCircle2 className="w-4 h-4" /> Audio adjunto correctamente.
              </div>
            )}
            <button 
              onClick={toggleActivityRecording}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all shadow-lg ${isRecordingActivity ? 'bg-red-600 text-white shadow-red-900/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}
            >
              {isRecordingActivity ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isRecordingActivity ? 'Detener STT y Guardar Audio' : 'Dictar STT y Grabar Audio'}
            </button>
          </div>
        </section>

        {/* Novedades Multi-Categoría (Instalaciones) */}
        <section className="mt-2">
          <h2 className="text-xl font-semibold mb-4 text-white">Reporte de Fallas (Instalaciones/Equipos)</h2>
          
          {/* Añadir Novedad */}
          <div className="glass-dark rounded-xl p-4 border border-white/5 flex flex-col gap-4 mb-4">
            <select 
              value={currentCategory} 
              onChange={e => setCurrentCategory(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {NOVELTY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <textarea 
              value={currentNoveltyText}
              onChange={(e) => setCurrentNoveltyText(e.target.value)}
              placeholder="Describa la anomalía o presione 'Dictar STT' para grabar su voz y transcribirla..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            <button 
              onClick={toggleRecording}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all shadow-lg ${isRecording ? 'bg-red-600 text-white shadow-red-900/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isRecording ? 'Detener Grabación y Guardar' : 'Dictar STT y Grabar Audio'}
            </button>
          </div>

          {/* Lista de Novedades Añadidas */}
          {novelties.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Novedades Registradas:</h3>
              {novelties.map((nov) => (
                <div key={nov.id} className="glass rounded-xl p-4 border border-red-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold">{nov.category}</span>
                    <button onClick={() => setNovelties(prev => prev.filter(n => n.id !== nov.id))} className="text-gray-500 hover:text-white"><XCircle className="w-4 h-4" /></button>
                  </div>
                  <p className="text-sm text-gray-200">{nov.text}</p>
                  
                  {/* Photo Section for this Novelty */}
                  <div className="border-t border-white/10 pt-3 mt-1 flex flex-col gap-2">
                    {nov.photoUrl ? (
                      <div className="relative rounded-xl overflow-hidden h-32 bg-black/50 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={nov.photoUrl} alt="Evidencia" className="object-contain w-full h-full" />
                      </div>
                    ) : (
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleNoveltyPhotoUpload(e, nov.id)}
                        />
                        <button className="w-full py-2 bg-white/5 rounded-lg text-gray-400 text-sm flex items-center justify-center gap-2 pointer-events-none">
                          <Camera className="w-4 h-4" />
                          Adjuntar Foto Descriptiva
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Floating Submit Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 glass-dark border-t border-white/10 z-50">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full text-white font-semibold rounded-xl py-4 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isSubmitting ? 'bg-blue-800 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'}`}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Enviando Reporte...</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Reporte a Admin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

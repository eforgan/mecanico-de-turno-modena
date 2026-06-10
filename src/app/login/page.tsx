"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Si no hay Supabase Keys, simplemente navegamos simulando login.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="glass-dark border border-white/5 p-8 rounded-2xl w-full max-w-md z-10 flex flex-col gap-6 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciar Sesión</h1>
          <p className="text-sm text-gray-400">Acceso exclusivo mecánicos y supervisores</p>
        </div>

        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs p-3 rounded-xl text-center">
            Modo Demo: No se detectaron claves de Supabase. El inicio de sesión está simulado.
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="nombre@gruppomodena.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contraseña</label>
              <Link href="/reset-password" className="text-xs text-blue-400 hover:text-blue-300">
                ¿Olvidaste tu clave?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl mt-2 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>Ingresar al Sistema <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="text-center mt-2">
          <p className="text-sm text-gray-400">
            ¿No tienes cuenta? <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

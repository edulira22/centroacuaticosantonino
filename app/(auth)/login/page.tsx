'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Waves, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : 'Error al iniciar sesión. Intenta de nuevo.'
      );
      setLoading(false);
      return;
    }

    router.push('/recepcion');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-4">
      {/* Card de login */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header con logo */}
        <div className="bg-primary px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Waves className="text-accent" size={36} strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight text-center">
            Centro Acuático Chihuahua
          </h1>
          <p className="text-accent text-sm mt-1 tracking-widest uppercase font-medium">
            AquaControl
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
          <h2 className="text-text font-display text-xl font-semibold text-center">
            Iniciar sesión
          </h2>

          {/* Error inline */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-vencido/30 text-vencido rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-text">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@centroacuatico.mx"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-text
                           focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary
                           placeholder:text-text-muted/60 transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-text">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-text
                           focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary
                           placeholder:text-text-muted/60 transition"
              />
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-secondary text-white font-semibold rounded-lg
                       transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                       text-sm tracking-wide"
          >
            {loading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-text-muted">
            Sistema exclusivo para personal autorizado del Centro Acuático Chihuahua
          </p>
        </div>
      </div>
    </div>
  );
}

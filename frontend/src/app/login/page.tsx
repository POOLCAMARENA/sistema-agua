'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/lib/store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

async function loginWithRetry(email: string, password: string, attempt = 1): Promise<any> {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (err: any) {
    const isNetworkError = !err.response && (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || err.message?.includes('timeout'));
    if (isNetworkError && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return loginWithRetry(email, password, attempt + 1);
    }
    throw err;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('Conectando al servidor...');

    try {
      const data = await loginWithRetry(email, password);
      setStatus('Sesion iniciada correctamente');
      setAuth(data.usuario, data.token);
      router.push('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('El servidor esta iniciando, intente de nuevo en unos segundos');
      } else {
        setError(err.response?.data?.error || 'Error al iniciar sesion');
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Agua</h1>
            <p className="text-gray-600 mt-2">Inicia sesion para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {status && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {status}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="tu@email.com"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Credenciales de prueba:</p>
            <p className="font-mono text-xs mt-1">admin@sistemaagua.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import api from '@/lib/axios';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2, Database } from 'lucide-react';

export default function AdminBackupPage() {
  const { usuario, token } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [confirmarRestore, setConfirmarRestore] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
    if (usuario && usuario.rol !== 'admin') router.push('/dashboard');
  }, [token, usuario, router]);

  const handleDescargar = async () => {
    setDescargando(true);
    setMensaje(null);
    try {
      const response = await api.get('/backup/download', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `backup_sistema_agua_${fecha}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMensaje({ tipo: 'exito', texto: 'Backup descargado correctamente' });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error al descargar el backup' });
    } finally {
      setDescargando(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos .sql' });
        return;
      }
      setArchivoSeleccionado(file);
      setMensaje(null);
    }
  };

  const handleRestaurar = async () => {
    if (!archivoSeleccionado) return;
    if (!confirmarRestore) {
      setConfirmarRestore(true);
      return;
    }

    setRestaurando(true);
    setMensaje(null);

    try {
      const texto = await archivoSeleccionado.text();
      await api.post('/backup/restore', { sql: texto });
      setMensaje({ tipo: 'exito', texto: 'Base de datos restaurada correctamente' });
      setArchivoSeleccionado(null);
      setConfirmarRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error al restaurar el backup' });
    } finally {
      setRestaurando(false);
    }
  };

  if (!usuario || usuario.rol !== 'admin') return null;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Backup y Restauración
        </h1>
        <p className="text-gray-500 mt-2">
          Descarga un backup de la base de datos o restaura desde un archivo previo.
        </p>
      </div>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Descargar Backup</h2>
              <p className="text-sm text-gray-500">Exporta todos los datos del sistema</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Se generará un archivo <code className="bg-gray-100 px-1 rounded">.sql</code> con todas las tablas y datos de la base de datos.
          </p>
          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {descargando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando backup...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Descargar Backup
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Restaurar Backup</h2>
              <p className="text-sm text-gray-500">Importa datos desde un archivo</p>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-800">
                <strong>Advertencia:</strong> Esta acción eliminará todos los datos actuales y los reemplazará con los del archivo.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            onChange={handleArchivoChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-orange-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors mb-3"
          >
            <Upload className="w-5 h-5" />
            {archivoSeleccionado ? archivoSeleccionado.name : 'Seleccionar archivo .sql'}
          </button>

          {archivoSeleccionado && (
            <button
              onClick={handleRestaurar}
              disabled={restaurando}
              className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-colors ${
                confirmarRestore
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white'
              }`}
            >
              {restaurando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Restaurando...
                </>
              ) : confirmarRestore ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  Confirmar Restauración
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Restaurar Backup
                </>
              )}
            </button>
          )}

          {confirmarRestore && (
            <button
              onClick={() => setConfirmarRestore(false)}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

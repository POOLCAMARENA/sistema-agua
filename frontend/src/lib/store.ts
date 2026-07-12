import { create } from 'zustand';
import { Usuario } from '@/types';

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  setAuth: (usuario: Usuario, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: null,
  token: null,
  setAuth: (usuario, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('usuario', JSON.stringify(usuario));
      localStorage.setItem('token', token);
    }
    set({ usuario, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
    }
    set({ usuario: null, token: null });
  },
  isAuthenticated: () => {
    const { token } = get();
    return !!token;
  },
}));

// Cargar estado desde localStorage al iniciar
if (typeof window !== 'undefined') {
  const usuario = localStorage.getItem('usuario');
  const token = localStorage.getItem('token');
  if (usuario && token) {
    useAuthStore.setState({ usuario: JSON.parse(usuario), token });
  }
}

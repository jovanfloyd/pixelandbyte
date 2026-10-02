import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { ThemeMode } from '../types/cube';
import { loginWithGoogle, logoutUser, verifyUserAdmin } from '../firebase/cubeService';
import { User } from 'firebase/auth';

const AUTHORIZED_ADMIN_EMAIL = 'jovanfloyd@gmail.com';

interface AdminLoginModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  theme,
  onClose,
  onLoginSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Exclusively Firebase Google Authentication for jovanfloyd@gmail.com
  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();

      // Verify that this Google account is the owner/administrator
      const isAdmin = await verifyUserAdmin(user);
      if (!isAdmin && user.email !== AUTHORIZED_ADMIN_EMAIL) {
        await logoutUser();
        setError(`Acceso restringido. La cuenta ${user.email || ''} no tiene permisos de administrador. Solo ${AUTHORIZED_ADMIN_EMAIL} puede administrar.`);
        return;
      }

      onLoginSuccess(user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isClosedByUser = msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request');
      const isBlocked = msg.includes('popup-blocked');

      if (isClosedByUser) {
        console.warn('Google sign-in popup was closed by user.');
        setError('Has cancelado la ventana de Google. Pulsa de nuevo para iniciar sesión.');
      } else if (isBlocked) {
        console.warn('Google sign-in popup was blocked by browser.');
        setError('El navegador bloqueó la ventana emergente de Google. Habilita las ventanas emergentes (popups) en la barra de tu navegador para continuar.');
      } else {
        console.error('Firebase authentication error:', err);
        setError('Error al conectar con los servidores de Firebase. Por favor intenta de nuevo.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-500">
            <Lock size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Panel de Administrador</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Autenticación segura con Google Firebase
            </p>
          </div>
        </div>


        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Exclusive Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold border transition-all shadow-md bg-white text-slate-800 hover:bg-slate-50 hover:shadow-lg border-slate-300 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? 'Iniciando sesión...' : 'Continuar con Google'}</span>
        </button>
      </div>
    </div>
  );
};

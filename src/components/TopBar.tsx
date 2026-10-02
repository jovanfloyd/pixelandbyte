import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Shield,
  ShieldCheck,
  ChevronDown,
  Box,
  Shuffle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { ThemeMode } from '../types/cube';

interface TopBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isAdminLoggedIn: boolean;
  onOpenAdmin: () => void;
  onSelectView: (view: string) => void;
  onScramble: () => void;
  onReset: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  isAdminLoggedIn,
  onOpenAdmin,
  onSelectView,
  onScramble,
  onReset,
}) => {
  const [rubikMenuOpen, setRubikMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setRubikMenuOpen(false);
      }
    };
    if (rubikMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rubikMenuOpen]);

  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3.5 transition-colors duration-200 border-b ${
        isDark
          ? 'bg-slate-950/80 border-slate-800/80 text-white backdrop-blur-md'
          : 'bg-white/85 border-slate-200/90 text-slate-900 backdrop-blur-md'
      }`}
    >
      {/* Zone 1: PixelandByte Brand Wordmark & Rubik Menu */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2 select-none group">
          <span className="text-xl font-bold tracking-tight text-indigo-500 group-hover:text-indigo-400 transition-colors">
            PixelandByte
          </span>
        </a>

        {/* Unified "Rubik" Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setRubikMenuOpen(!rubikMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              rubikMenuOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Box size={14} className={rubikMenuOpen ? 'text-white' : 'text-indigo-400'} />
            <span>Rubik</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${rubikMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Options */}
          {rubikMenuOpen && (
            <div
              className={`absolute top-full left-0 mt-2 w-52 rounded-xl border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 shadow-black/60'
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
              }`}
            >
              {/* Camera Views Section */}
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 opacity-80 flex items-center gap-1">
                <Eye size={12} />
                <span>Vistas 3D</span>
              </div>

              {[
                { id: 'isometric', label: 'Vista Isométrica' },
                { id: 'front', label: 'Vista Frontal' },
                { id: 'top', label: 'Vista Superior' },
                { id: 'right', label: 'Vista Derecha' },
                { id: 'back', label: 'Vista Trasera' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    setRubikMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                      : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />

              {/* Actions Section: Scramble & Reset */}
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 opacity-80">
                Acciones
              </div>

              <button
                onClick={() => {
                  onScramble();
                  setRubikMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  isDark
                    ? 'hover:bg-amber-950/40 text-amber-400'
                    : 'hover:bg-amber-50 text-amber-700'
                }`}
              >
                <Shuffle size={14} />
                <span>Mezclar Cubo</span>
              </button>

              <button
                onClick={() => {
                  onReset();
                  setRubikMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <RefreshCw size={14} />
                <span>Reiniciar / Resolver</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Actions - Theme Switch, Audio, and Admin Login/Portal */}
      <div className="flex items-center gap-2.5">
        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Silenciar efectos' : 'Activar sonido'}
          className={`p-2 rounded-lg border transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Black/White Background Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Cambiar a fondo blanco' : 'Cambiar a fondo negro'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isDark
              ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {isDark ? (
            <>
              <Sun size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Fondo Blanco</span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-slate-700" />
              <span className="hidden sm:inline">Fondo Negro</span>
            </>
          )}
        </button>

        {/* Admin Access Button in Top-Right */}
        <button
          onClick={onOpenAdmin}
          title={isAdminLoggedIn ? 'Administrador de Caras y Cuadros' : 'Iniciar sesión como Administrador'}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
            isAdminLoggedIn
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30'
              : isDark
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-950/40'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isAdminLoggedIn ? (
            <>
              <ShieldCheck size={16} />
              <span>Admin Activo</span>
            </>
          ) : (
            <>
              <Shield size={16} />
              <span>Administrar</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

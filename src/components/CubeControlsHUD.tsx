import React, { useState } from 'react';
import { RotateCw, RotateCcw, Shuffle, RefreshCw, ChevronDown, ChevronUp, MousePointer, ExternalLink } from 'lucide-react';
import { MoveType, ThemeMode } from '../types/cube';

interface CubeControlsHUDProps {
  theme: ThemeMode;
  onMove: (move: MoveType) => void;
  onScramble: () => void;
  onReset: () => void;
  lastMove?: MoveType;
}

export const CubeControlsHUD: React.FC<CubeControlsHUDProps> = ({
  theme,
  onMove,
  onScramble,
  onReset,
  lastMove,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';

  const moveButtons: Array<{ key: MoveType; label: string; desc: string }> = [
    { key: 'U', label: 'U', desc: 'Superior Horario' },
    { key: "U'", label: "U'", desc: 'Superior Antihorario' },
    { key: 'D', label: 'D', desc: 'Inferior Horario' },
    { key: "D'", label: "D'", desc: 'Inferior Antihorario' },
    { key: 'F', label: 'F', desc: 'Frontal Horario' },
    { key: "F'", label: "F'", desc: 'Frontal Antihorario' },
    { key: 'B', label: 'B', desc: 'Trasera Horaria' },
    { key: "B'", label: "B'", desc: 'Trasera Antihoraria' },
    { key: 'R', label: 'R', desc: 'Derecha Horaria' },
    { key: "R'", label: "R'", desc: 'Derecha Antihoraria' },
    { key: 'L', label: 'L', desc: 'Izquierda Horaria' },
    { key: "L'", label: "L'", desc: 'Izquierda Antihoraria' },
  ];

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-2xl pointer-events-none">
      <div
        className={`pointer-events-auto rounded-2xl border p-3.5 shadow-2xl transition-all duration-300 backdrop-blur-md ${
          isDark
            ? 'bg-slate-950/85 border-slate-800/80 text-white'
            : 'bg-white/90 border-slate-200/90 text-slate-800 shadow-slate-300/40'
        }`}
      >
        {/* Header row of HUD: Status and Expand toggle */}
        <div className="flex items-center justify-between gap-3">
          {/* Layer Moves Indicator & Gestures */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Giro de Capas</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:flex items-center gap-1">
              <MousePointer size={12} className="text-emerald-400" />
              <span>Arrastra filas directamente</span>
            </span>
          </div>

          {/* Center hint text */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MousePointer size={12} className="text-emerald-400" />
              <span>Arrastra caras o fondo</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <ExternalLink size={12} className="text-sky-400" />
              <span>Clic para abrir enlace</span>
            </span>
          </div>

          {/* Toggle buttons drawer */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Capas</span>
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Collapsible Layer Buttons */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/40">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {moveButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => onMove(btn.key)}
                  title={btn.desc}
                  className={`py-1.5 px-1 text-center font-mono text-xs font-bold rounded-lg border transition-all active:scale-95 ${
                    lastMove === btn.key
                      ? 'border-indigo-500 bg-indigo-600/30 text-indigo-300'
                      : isDark
                      ? 'border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

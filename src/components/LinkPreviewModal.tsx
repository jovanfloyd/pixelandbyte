import React from 'react';
import { ExternalLink, Copy, Check, X, Globe } from 'lucide-react';
import { StickerConfig, ThemeMode } from '../types/cube';
import { FACE_METAS } from '../constants/defaultCubeConfig';

interface LinkPreviewModalProps {
  sticker: StickerConfig | null;
  theme: ThemeMode;
  onClose: () => void;
}

export const LinkPreviewModal: React.FC<LinkPreviewModalProps> = ({
  sticker,
  theme,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!sticker) return null;

  const isDark = theme === 'dark';
  const faceMeta = FACE_METAS[sticker.face];

  const handleCopy = () => {
    if (sticker.linkUrl) {
      navigator.clipboard.writeText(sticker.linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (sticker.linkUrl) {
      // Safe external link opener
      const a = document.createElement('a');
      a.href = sticker.linkUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X size={18} />
        </button>

        {/* Header metadata */}
        <div className="flex items-center gap-2 text-xs mb-3">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: faceMeta?.color || '#10b981' }}
          />
          <span className="font-semibold text-slate-400">
            {faceMeta?.label || sticker.face}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">
            Fila {sticker.row + 1}, Columna {sticker.col + 1}
          </span>
        </div>

        {/* Thumbnail Preview with Color Filter Overlay */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 border border-slate-700/40 bg-slate-950 flex items-center justify-center">
          <img
            src={sticker.imageUrl}
            alt={sticker.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {/* Authentic Face Color Filter Overlay */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-multiply"
            style={{
              backgroundColor: sticker.colorFilter || faceMeta?.color,
              opacity: sticker.filterOpacity ?? 0.42,
            }}
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white/90 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <span className="truncate font-medium">{sticker.title}</span>
            <span className="text-[11px] opacity-75">Filtro {faceMeta?.label?.split(' ')[0]}</span>
          </div>
        </div>

        {/* Title with larger typography */}
        <div className="mb-5">
          <h3 className="text-2xl font-extrabold tracking-tight text-balance">
            {sticker.title}
          </h3>
        </div>

        {/* Destination URL Display */}
        <div
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono mb-5 ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <Globe size={14} className="shrink-0 text-sky-500" />
          <span className="truncate flex-1">{sticker.linkUrl || 'Sin enlace configurado'}</span>
          <button
            onClick={handleCopy}
            title="Copiar enlace"
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenLink}
            disabled={!sticker.linkUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <ExternalLink size={16} />
            <span>Abrir Página Externa</span>
          </button>
        </div>
      </div>
    </div>
  );
};

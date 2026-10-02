import React, { useState } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Upload,
  Link,
  Sliders,
  Check,
  Globe,
  Image as ImageIcon,
  LogOut,
  Palette,
  Eye,
  Sparkles,
} from 'lucide-react';
import { CubeConfig, FaceName, StickerConfig, ThemeMode } from '../types/cube';
import { FACE_METAS, generateCuratedSvgImage } from '../constants/defaultCubeConfig';
import { invalidateTextureCache } from '../utils/textureGenerator';
import { isWikiMediaUrl, resolveAnyImageUrl } from '../utils/imageUrlResolver';

interface AdminModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  config: CubeConfig;
  token: string | null;
  adminEmail?: string | null;
  initialSelectedStickerId?: string | null;
  onClose: () => void;
  onSaveConfig: (updated: CubeConfig) => Promise<boolean>;
  onResetDefaults: () => Promise<void>;
  onLogout: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  theme,
  config,
  token,
  adminEmail,
  initialSelectedStickerId,
  onClose,
  onSaveConfig,
  onResetDefaults,
  onLogout,
}) => {
  const [activeFace, setActiveFace] = useState<FaceName>('front');
  const [localConfig, setLocalConfig] = useState<CubeConfig>(config);
  const [selectedStickerId, setSelectedStickerId] = useState<string>('front-0-0');
  const [isSaving, setIsSaving] = useState(false);
  const [isResolvingImage, setIsResolvingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync initial sticker if opened via shortcut
  React.useEffect(() => {
    if (initialSelectedStickerId && config.stickers[initialSelectedStickerId]) {
      const st = config.stickers[initialSelectedStickerId];
      setActiveFace(st.face);
      setSelectedStickerId(initialSelectedStickerId);
    }
  }, [initialSelectedStickerId, config]);

  // Keep localConfig updated when outer config updates
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const faces: FaceName[] = ['front', 'back', 'up', 'down', 'right', 'left'];
  const activeMeta = FACE_METAS[activeFace];
  const selectedSticker = localConfig.stickers[selectedStickerId] || localConfig.stickers[`${activeFace}-0-0`];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStickerField = (field: keyof StickerConfig, value: string | number) => {
    if (!selectedSticker) return;
    setLocalConfig((prev) => {
      const updatedStickers = { ...prev.stickers };
      updatedStickers[selectedSticker.id] = {
        ...updatedStickers[selectedSticker.id],
        [field]: value,
      };
      return {
        ...prev,
        stickers: updatedStickers,
      };
    });
  };

  const handleUpdateFaceColor = (face: FaceName, color: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      faceColors: {
        ...prev.faceColors,
        [face]: color,
      },
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSticker) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      handleUpdateStickerField('imageUrl', dataUrl);
      showToast('Imagen cargada correctamente');
    };
    reader.readAsDataURL(file);
  };

  const handleImageInputChange = async (value: string) => {
    handleUpdateStickerField('imageUrl', value);

    if (isWikiMediaUrl(value)) {
      setIsResolvingImage(true);
      try {
        const res = await resolveAnyImageUrl(value);
        if (res && res.imageUrl) {
          handleUpdateStickerField('imageUrl', res.imageUrl);
          if (res.suggestedTitle && selectedSticker && (selectedSticker.title.startsWith('Cuadro') || !selectedSticker.title)) {
            handleUpdateStickerField('title', res.suggestedTitle);
          }
          showToast('✓ Imagen de Wikipedia extraída y aplicada con éxito');
        }
      } catch (err) {
        console.error('Error resolving image:', err);
      } finally {
        setIsResolvingImage(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    invalidateTextureCache();
    const ok = await onSaveConfig(localConfig);
    setIsSaving(false);
    if (ok) {
      showToast('¡Guardado con éxito en Firebase Firestore!');
    } else {
      showToast('Error al guardar en Firebase');
    }
  };

  const handleReset = async () => {
    if (confirm('¿Restablecer todas las caras, imágenes y enlaces a los valores iniciales?')) {
      await onResetDefaults();
      showToast('Cubo restablecido a valores por defecto');
    }
  };

  const applyPresetImage = (presetKey: string) => {
    if (!selectedSticker) return;
    const presets: Record<string, { title: string; subtitle: string; gradient: [string, string]; symbol: string }> = {
      space: { title: 'Galaxia Profunda', subtitle: 'Cosmos y nebulosas', gradient: ['#172554', '#3b82f6'], symbol: '🚀' },
      nature: { title: 'Valle Andino', subtitle: 'Cordilleras y lagos', gradient: ['#065f46', '#10b981'], symbol: '🌲' },
      tech: { title: 'Microchip Cuántico', subtitle: 'Computación moderna', gradient: ['#312e81', '#6366f1'], symbol: '⚡' },
      art: { title: 'Arte Clásico', subtitle: 'Galería renacentista', gradient: ['#831843', '#ec4899'], symbol: '🎨' },
      gold: { title: 'Moneda Antigua', subtitle: 'Civilizaciones de oro', gradient: ['#713f12', '#eab308'], symbol: '🪙' },
      cyber: { title: 'Ciudad Futura', subtitle: 'Neón y rascacielos', gradient: ['#0f172a', '#06b6d4'], symbol: '🌐' },
    };

    const chosen = presets[presetKey];
    if (chosen) {
      const svgUrl = generateCuratedSvgImage(chosen.title, chosen.subtitle, chosen.gradient, chosen.symbol);
      handleUpdateStickerField('imageUrl', svgUrl);
      handleUpdateStickerField('title', chosen.title);
      handleUpdateStickerField('description', chosen.subtitle);
      showToast(`Plantilla "${chosen.title}" aplicada`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-5xl h-[92vh] max-h-[850px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Administrador del Cubo Rubik 3D</h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firebase Firestore
                </span>
                {adminEmail && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {adminEmail}
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sincronización en tiempo real de imagen, título y enlace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-700/20 active:scale-95 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>

            <button
              onClick={handleReset}
              title="Restablecer valores originales"
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={onLogout}
              title="Cerrar sesión de administrador"
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 text-rose-400 hover:bg-rose-950/40'
                  : 'border-slate-200 text-rose-600 hover:bg-rose-50'
              }`}
            >
              <LogOut size={16} />
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-950 text-white border border-indigo-500/40 text-xs font-medium shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Face Navigation Tabs */}
        <div
          className={`flex items-center gap-1.5 px-6 py-2.5 border-b overflow-x-auto ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-100/50'
          }`}
        >
          {faces.map((face) => {
            const meta = FACE_METAS[face];
            const color = localConfig.faceColors[face] || meta.color;
            const isSelected = activeFace === face;
            return (
              <button
                key={face}
                onClick={() => {
                  setActiveFace(face);
                  setSelectedStickerId(`${face}-0-0`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area: Left Grid (3x3) + Right Inspector */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* 3x3 Interactive Face Grid (5 cols) */}
          <div
            className={`p-6 md:col-span-5 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r overflow-y-auto ${
              isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="w-full max-w-xs mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">
                Cuadros de la {activeMeta.label}
              </span>
              <span className="font-mono text-slate-500">9 casillas (3x3)</span>
            </div>

            {/* Visual 3x3 Rubik's Face */}
            <div className="p-3 rounded-2xl bg-slate-950 border-2 border-slate-800 shadow-2xl w-full max-w-xs aspect-square grid grid-cols-3 gap-2">
              {[0, 1, 2].map((r) =>
                [0, 1, 2].map((c) => {
                  const id = `${activeFace}-${r}-${c}`;
                  const sticker = localConfig.stickers[id];
                  const isSelected = selectedStickerId === id;
                  const effectiveColor = sticker?.colorFilter || localConfig.faceColors[activeFace] || activeMeta.color;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedStickerId(id)}
                      className={`relative rounded-xl overflow-hidden group transition-all transform active:scale-95 ${
                        isSelected
                          ? 'ring-4 ring-indigo-500 scale-105 z-10 shadow-lg shadow-indigo-500/30'
                          : 'hover:opacity-95'
                      }`}
                    >
                      {sticker?.imageUrl ? (
                        <img
                          src={sticker.imageUrl}
                          alt={sticker.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: effectiveColor }}
                        />
                      )}

                      {/* Face Color Filter Tint applied over the image */}
                      <div
                        className="absolute inset-0 pointer-events-none mix-blend-multiply"
                        style={{
                          backgroundColor: effectiveColor,
                          opacity: sticker?.filterOpacity ?? localConfig.filterOpacity ?? 0.42,
                        }}
                      />

                      {/* Glossy sheen overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/40 pointer-events-none" />

                      {/* Coordinate label */}
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90 px-1 rounded">
                        {r + 1},{c + 1}
                      </div>

                      {/* Title banner */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-sm px-1 py-0.5 text-center">
                        <span className="text-[10px] text-white font-medium truncate block leading-tight">
                          {sticker?.title || `Cuadro ${r * 3 + c + 1}`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Face color & opacity quick sliders */}
            <div className="w-full max-w-xs mt-4 pt-3 border-t border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Color Base de la Cara:</span>
                <input
                  type="color"
                  value={localConfig.faceColors[activeFace] || activeMeta.color}
                  onChange={(e) => handleUpdateFaceColor(activeFace, e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Intensidad Filtro ({Math.round((localConfig.filterOpacity || 0.42) * 100)}%):</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.05"
                  value={localConfig.filterOpacity || 0.42}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      filterOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-32 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Inspector: Details of Selected Sticker (7 cols) */}
          <div className="p-6 md:col-span-7 overflow-y-auto space-y-5">
            {selectedSticker ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          selectedSticker.colorFilter || localConfig.faceColors[activeFace] || activeMeta.color,
                      }}
                    />
                    <h3 className="text-sm font-bold tracking-tight">
                      Editando Cuadro [Fila {selectedSticker.row + 1}, Columna {selectedSticker.col + 1}]
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{selectedSticker.id}</span>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-75">
                    Título del Cuadro
                  </label>
                  <input
                    type="text"
                    value={selectedSticker.title}
                    onChange={(e) => handleUpdateStickerField('title', e.target.value)}
                    placeholder="Nombre del cuadro"
                    className={`w-full px-3.5 py-2.5 text-base font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* External Link (Mandatory Requirement) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-75 flex items-center justify-between">
                    <span>Enlace Externo al dar Clic</span>
                    {selectedSticker.linkUrl && (
                      <a
                        href={selectedSticker.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-normal lowercase"
                      >
                        <Globe size={12} />
                        <span>Probar enlace</span>
                      </a>
                    )}
                  </label>
                  <div className="relative">
                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={selectedSticker.linkUrl}
                      onChange={(e) => handleUpdateStickerField('linkUrl', e.target.value)}
                      placeholder="https://ejemplo.com o https://es.wikipedia.org/..."
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Al hacer clic sobre este cuadro en el cubo 3D, el usuario podrá ir directamente a esta página externa.
                  </p>
                </div>

                {/* Image Configuration & Upload */}
                <div className="p-4 rounded-xl border space-y-3 bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>Imagen del Cuadro</span>
                    </span>

                    {/* Local File Upload button */}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 cursor-pointer transition-colors">
                      <Upload size={13} />
                      <span>Subir Foto Local</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                      <span>URL Directa o Enlace de Wikipedia / Wikimedia:</span>
                      {isResolvingImage && (
                        <span className="text-amber-400 font-semibold animate-pulse text-[11px]">
                          Extrayendo imagen de Wikipedia...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={selectedSticker.imageUrl}
                      onChange={(e) => handleImageInputChange(e.target.value)}
                      placeholder="https://... o https://es.wikipedia.org/...#/media/Archivo:..."
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Puedes pegar directamente enlaces de Wikipedia como:{' '}
                      <span className="font-mono text-[10px] text-indigo-400 break-all select-all">
                        https://es.wikipedia.org/wiki/...#/media/Archivo:...
                      </span>
                    </p>
                  </div>

                  {/* Quick Preset Library */}
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400" />
                      <span>Plantillas Curadas Rápidas:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'space', label: 'Cosmos' },
                        { key: 'nature', label: 'Naturaleza' },
                        { key: 'tech', label: 'Tecnología' },
                        { key: 'art', label: 'Arte' },
                        { key: 'gold', label: 'Dorado' },
                        { key: 'cyber', label: 'Futurista' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => applyPresetImage(preset.key)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            isDark
                              ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Color Filter Customization */}
                <div className="p-4 rounded-xl border space-y-3 bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                      <Palette size={14} />
                      <span>Filtro de Color para este Cuadro</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleUpdateStickerField('colorFilter', '')}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Restablecer al color de la cara
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">Color de Tinte Personalizado:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            selectedSticker.colorFilter ||
                            localConfig.faceColors[activeFace] ||
                            activeMeta.color
                          }
                          onChange={(e) => handleUpdateStickerField('colorFilter', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-slate-400">
                          {selectedSticker.colorFilter || '(Hereda cara)'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs text-slate-400 mb-1">
                        Opacidad del Filtro ({Math.round((selectedSticker.filterOpacity ?? localConfig.filterOpacity ?? 0.42) * 100)}%):
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedSticker.filterOpacity ?? localConfig.filterOpacity ?? 0.42}
                        onChange={(e) => handleUpdateStickerField('filterOpacity', parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Selecciona un cuadro en la cuadrícula 3x3 de la izquierda para editarlo
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

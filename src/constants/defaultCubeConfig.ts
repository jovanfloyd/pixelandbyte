import { CubeConfig, FaceMeta, FaceName, StickerConfig } from '../types/cube';

export const FACE_METAS: Record<FaceName, FaceMeta> = {
  front: {
    name: 'front',
    label: 'Frontal (Verde)',
    color: '#16a34a', // Emerald Green
    normal: [0, 0, 1],
    description: 'Naturaleza, Bosques y Biodiversidad',
  },
  back: {
    name: 'back',
    label: 'Trasera (Azul)',
    color: '#2563eb', // Royal Blue
    normal: [0, 0, -1],
    description: 'Océanos, Cielos y Astronomía',
  },
  up: {
    name: 'up',
    label: 'Superior (Blanco)',
    color: '#f8fafc', // Crisp White
    normal: [0, 1, 0],
    description: 'Arquitectura Moderna y Minimalismo',
  },
  down: {
    name: 'down',
    label: 'Inferior (Amarillo)',
    color: '#eab308', // Solar Yellow
    normal: [0, -1, 0],
    description: 'Energía Solar, Desiertos y Cultura Dorada',
  },
  right: {
    name: 'right',
    label: 'Derecha (Rojo)',
    color: '#dc2626', // Crimson Red
    normal: [1, 0, 0],
    description: 'Innovación, Volcanes y Pasión Creativa',
  },
  left: {
    name: 'left',
    label: 'Izquierda (Naranja)',
    color: '#ea580c', // Bright Orange
    normal: [-1, 0, 0],
    description: 'Atardeceres, Exploración y Aventuras',
  },
};

// Generates an attractive stylized SVG data URL with domain theme icon and text (fills whole square)
export function generateCuratedSvgImage(title: string, _subtitle: string, bgGradient: [string, string], symbol: string): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}" />
        <stop offset="100%" stop-color="${bgGradient[1]}" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect width="512" height="512" fill="url(#grad)"/>
    <g filter="url(#shadow)">
      <circle cx="256" cy="225" r="115" fill="rgba(255,255,255,0.2)" />
      <text x="256" y="260" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="96" text-anchor="middle" fill="#ffffff">${symbol}</text>
    </g>
    <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="0.5">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Curated 54 items across 6 faces
const SEED_DATA: Record<FaceName, Array<{ title: string; subtitle: string; link: string; symbol: string; gradient: [string, string] }>> = {
  // Front: Green
  front: [
    { title: 'Selva Amazónica', subtitle: 'Pulmón verde del planeta', link: 'https://es.wikipedia.org/wiki/Amazonia', symbol: '🌿', gradient: ['#065f46', '#047857'] },
    { title: 'Parque Serengueti', subtitle: 'Gran migración silvestre', link: 'https://es.wikipedia.org/wiki/Parque_nacional_del_Serengueti', symbol: '🦁', gradient: ['#047857', '#10b981'] },
    { title: 'Bosque de Bambú', subtitle: 'Arashiyama, Kioto Japón', link: 'https://es.wikipedia.org/wiki/Arashiyama', symbol: '🎋', gradient: ['#064e3b', '#059669'] },
    { title: 'Monte Everest', subtitle: 'Cima sagrada del Himalaya', link: 'https://es.wikipedia.org/wiki/Monte_Everest', symbol: '⛰️', gradient: ['#134e4a', '#0d9488'] },
    { title: 'Cataratas de Iguazú', subtitle: 'Maravilla natural mundial', link: 'https://es.wikipedia.org/wiki/Cataratas_del_Iguaz%C3%BA', symbol: '🌊', gradient: ['#0f766e', '#14b8a6'] },
    { title: 'Fiordos Noruegos', subtitle: 'Geirangerfjord místico', link: 'https://es.wikipedia.org/wiki/Geirangerfjord', symbol: '🏔️', gradient: ['#047857', '#10b981'] },
    { title: 'Islas Galápagos', subtitle: 'Cuna de la evolución viva', link: 'https://es.wikipedia.org/wiki/Islas_Gal%C3%A1pagos', symbol: '🐢', gradient: ['#065f46', '#34d399'] },
    { title: 'Gran Cañón', subtitle: 'Geología monumental', link: 'https://es.wikipedia.org/wiki/Gran_Ca%C3%B1%C3%B3n', symbol: '🦅', gradient: ['#064e3b', '#059669'] },
    { title: 'Boreal Taiga', subtitle: 'Bosque de coníferas ártico', link: 'https://es.wikipedia.org/wiki/Taiga', symbol: '🌲', gradient: ['#0f766e', '#059669'] },
  ],
  // Back: Blue
  back: [
    { title: 'Fosa de las Marianas', subtitle: 'Profundidad oceánica récord', link: 'https://es.wikipedia.org/wiki/Fosa_de_las_Marianas', symbol: '🐋', gradient: ['#1e3a8a', '#1d4ed8'] },
    { title: 'Nebulosa Orión', subtitle: 'Vivero estelar cósmico', link: 'https://es.wikipedia.org/wiki/Nebulosa_de_Ori%C3%B3n', symbol: '✨', gradient: ['#172554', '#2563eb'] },
    { title: 'Telescopio Webb', subtitle: 'Mirando el origen del universo', link: 'https://es.wikipedia.org/wiki/Telescopio_espacial_James_Webb', symbol: '🔭', gradient: ['#1e40af', '#3b82f6'] },
    { title: 'Gran Barrera Coral', subtitle: 'Ecosistema submarino vivo', link: 'https://es.wikipedia.org/wiki/Gran_barrera_de_coral', symbol: '🐠', gradient: ['#1e3a8a', '#0284c7'] },
    { title: 'Auroras Boreales', subtitle: 'Luces del firmamento nórdico', link: 'https://es.wikipedia.org/wiki/Aurora_polar', symbol: '🌌', gradient: ['#0f172a', '#1d4ed8'] },
    { title: 'Mar Mediterráneo', subtitle: 'Cuna de civilizaciones clásicas', link: 'https://es.wikipedia.org/wiki/Mar_Mediterr%C3%A1neo', symbol: '⛵', gradient: ['#1d4ed8', '#60a5fa'] },
    { title: 'Galaxia Andrómeda', subtitle: 'Nuestra vecina espiral mayor', link: 'https://es.wikipedia.org/wiki/Galaxia_de_Andr%C3%B3meda', symbol: '🪐', gradient: ['#172554', '#1e40af'] },
    { title: 'Antártida Helada', subtitle: 'Continente blanco austral', link: 'https://es.wikipedia.org/wiki/Ant%C3%A1rtida', symbol: '🐧', gradient: ['#0369a1', '#38bdf8'] },
    { title: 'Estación Espacial', subtitle: 'Laboratorio en microgravedad', link: 'https://es.wikipedia.org/wiki/Estaci%C3%B3n_Espacial_Internacional', symbol: '🛰️', gradient: ['#1e3a8a', '#2563eb'] },
  ],
  // Up: White
  up: [
    { title: 'Museo Guggenheim', subtitle: 'Escultura orgánica de Bilbao', link: 'https://es.wikipedia.org/wiki/Museo_Guggenheim_Bilbao', symbol: '🏛️', gradient: ['#334155', '#64748b'] },
    { title: 'Ópera de Sídney', subtitle: 'Velas de concreto en la bahía', link: 'https://es.wikipedia.org/wiki/%C3%93pera_de_S%C3%ADdney', symbol: '🎭', gradient: ['#475569', '#94a3b8'] },
    { title: 'Burj Khalifa', subtitle: 'Rascacielos más alto del mundo', link: 'https://es.wikipedia.org/wiki/Burj_Khalifa', symbol: '🏙️', gradient: ['#1e293b', '#64748b'] },
    { title: 'Torre Eiffel', subtitle: 'Icono de acero forjado parisino', link: 'https://es.wikipedia.org/wiki/Torre_Eiffel', symbol: '🗼', gradient: ['#334155', '#475569'] },
    { title: 'Sagrada Familia', subtitle: 'Genio modernista de Gaudí', link: 'https://es.wikipedia.org/wiki/Bas%C3%ADlica_de_la_Sagrada_Familia', symbol: '⛪', gradient: ['#475569', '#64748b'] },
    { title: 'Panteón de Agripa', subtitle: 'Cúpula colosal de Roma', link: 'https://es.wikipedia.org/wiki/Pante%C3%B3n_de_Agripa', symbol: '🏛️', gradient: ['#334155', '#94a3b8'] },
    { title: 'Puente Golden Gate', subtitle: 'Ingeniería en San Francisco', link: 'https://es.wikipedia.org/wiki/Puente_Golden_Gate', symbol: '🌉', gradient: ['#1e293b', '#475569'] },
    { title: 'El Louvre', subtitle: 'Pirámide de cristal y tesoros', link: 'https://es.wikipedia.org/wiki/Museo_del_Louvre', symbol: '🎨', gradient: ['#334155', '#64748b'] },
    { title: 'Taj Mahal', subtitle: 'Mausoleo de mármol blanco', link: 'https://es.wikipedia.org/wiki/Taj_Mahal', symbol: '🕌', gradient: ['#475569', '#cbd5e1'] },
  ],
  // Down: Yellow
  down: [
    { title: 'Pirámides de Guiza', subtitle: 'Monumento del antiguo Egipto', link: 'https://es.wikipedia.org/wiki/Gran_Pir%C3%A1mide_de_Guiza', symbol: '🐪', gradient: ['#854d0e', '#ca8a04'] },
    { title: 'Desierto del Sahara', subtitle: 'Dunas infinitas de arena dorada', link: 'https://es.wikipedia.org/wiki/Desierto_del_S%C3%A1hara', symbol: '🏜️', gradient: ['#a16207', '#eab308'] },
    { title: 'El Dorado Mítico', subtitle: 'Tesoros y leyenda precolombina', link: 'https://es.wikipedia.org/wiki/El_Dorado', symbol: '👑', gradient: ['#713f12', '#ca8a04'] },
    { title: 'Energía Solar', subtitle: 'Transición energética limpia', link: 'https://es.wikipedia.org/wiki/Energ%C3%ADa_solar', symbol: '☀️', gradient: ['#854d0e', '#facc15'] },
    { title: 'Campos de Girasoles', subtitle: 'Toscana y valles en flor', link: 'https://es.wikipedia.org/wiki/Helianthus_annuus', symbol: '🌻', gradient: ['#a16207', '#eab308'] },
    { title: 'Templo Kinkaku-ji', subtitle: 'Pabellón Dorado de Kioto', link: 'https://es.wikipedia.org/wiki/Kinkaku-ji', symbol: '⛩️', gradient: ['#713f12', '#ca8a04'] },
    { title: 'Petra Jordania', subtitle: 'La ciudad tallada en roca', link: 'https://es.wikipedia.org/wiki/Petra', symbol: '🏺', gradient: ['#854d0e', '#eab308'] },
    { title: 'Valle de Fuego', subtitle: 'Arenisca bermeja en Nevada', link: 'https://es.wikipedia.org/wiki/Parque_estatal_del_Valle_del_Fuego', symbol: '🔥', gradient: ['#a16207', '#facc15'] },
    { title: 'Ruta de la Seda', subtitle: 'Caravanas y comercio histórico', link: 'https://es.wikipedia.org/wiki/Ruta_de_la_Seda', symbol: '📜', gradient: ['#713f12', '#ca8a04'] },
  ],
  // Right: Red
  right: [
    { title: 'Volcán Kilauea', subtitle: 'Fuerza volcánica de Hawái', link: 'https://es.wikipedia.org/wiki/K%C4%ABlauea', symbol: '🌋', gradient: ['#7f1d1d', '#dc2626'] },
    { title: 'Exploración de Marte', subtitle: 'El planeta rojo y rovers', link: 'https://es.wikipedia.org/wiki/Marte_(planeta)', symbol: '🔴', gradient: ['#991b1b', '#ef4444'] },
    { title: 'Cerezo en Flor', subtitle: 'Sakura primaveral japonés', link: 'https://es.wikipedia.org/wiki/Sakura_(cerezo)', symbol: '🌸', gradient: ['#881337', '#e11d48'] },
    { title: 'Ferrari Maranello', subtitle: 'Historia y diseño automotor', link: 'https://es.wikipedia.org/wiki/Ferrari', symbol: '🏎️', gradient: ['#991b1b', '#dc2626'] },
    { title: 'Plaza Roja de Moscú', subtitle: 'Catedral de San Basilio', link: 'https://es.wikipedia.org/wiki/Plaza_Roja', symbol: '🏰', gradient: ['#7f1d1d', '#b91c1c'] },
    { title: 'Arrecife Coral Rojo', subtitle: 'Ecosistema vivo del mar', link: 'https://es.wikipedia.org/wiki/Corallium_rubrum', symbol: '🪸', gradient: ['#881337', '#f43f5e'] },
    { title: 'Cañón del Antílope', subtitle: 'Ondulaciones de arenisca roja', link: 'https://es.wikipedia.org/wiki/Ca%C3%B1%C3%B3n_del_Ant%C3%ADlope', symbol: '📸', gradient: ['#991b1b', '#ef4444'] },
    { title: 'Teatro Colón', subtitle: 'Acústica magistral en Buenos Aires', link: 'https://es.wikipedia.org/wiki/Teatro_Col%C3%B3n', symbol: '🎻', gradient: ['#7f1d1d', '#dc2626'] },
    { title: 'Lámpara de Rubí', subtitle: 'Piedras preciosas y física láser', link: 'https://es.wikipedia.org/wiki/Rub%C3%AD', symbol: '💎', gradient: ['#881337', '#e11d48'] },
  ],
  // Left: Orange
  left: [
    { title: 'Atardecer en Santorini', subtitle: 'Ocaso blanco y calderas', link: 'https://es.wikipedia.org/wiki/Santorini', symbol: '🌅', gradient: ['#7c2d12', '#ea580c'] },
    { title: 'Mariposas Monarca', subtitle: 'Santuario de Michoacán', link: 'https://es.wikipedia.org/wiki/Danaus_plexippus', symbol: '🦋', gradient: ['#9a3412', '#f97316'] },
    { title: 'Gran Bazar Estambul', subtitle: 'Especias, faroles y aromas', link: 'https://es.wikipedia.org/wiki/Gran_Bazar', symbol: '🏮', gradient: ['#7c2d12', '#c2410c'] },
    { title: 'Cañón del Cobre', subtitle: 'Barrancas majestuosas de México', link: 'https://es.wikipedia.org/wiki/Barrancas_del_Cobre', symbol: '🏜️', gradient: ['#9a3412', '#ea580c'] },
    { title: 'Templo Prambanan', subtitle: 'Arquitectura hindú en Java', link: 'https://es.wikipedia.org/wiki/Prambanan', symbol: '🛕', gradient: ['#7c2d12', '#f97316'] },
    { title: 'Bosques de Otoño', subtitle: 'Colores ocres en Nueva Inglaterra', link: 'https://es.wikipedia.org/wiki/Oto%C3%B1o', symbol: '🍁', gradient: ['#9a3412', '#fb923c'] },
    { title: 'Valle de los Reyes', subtitle: 'Tumbas de la dinastía de Luxor', link: 'https://es.wikipedia.org/wiki/Valle_de_los_Reyes', symbol: '🏺', gradient: ['#7c2d12', '#ea580c'] },
    { title: 'Pampa Argentina', subtitle: 'Tierras gauchas y horizontes', link: 'https://es.wikipedia.org/wiki/Regi%C3%B3n_pampeana', symbol: '🐎', gradient: ['#9a3412', '#c2410c'] },
    { title: 'Festival de Linternas', subtitle: 'Yi Peng en Chiang Mai Tailandia', link: 'https://es.wikipedia.org/wiki/Loi_Krathong', symbol: '✨', gradient: ['#7c2d12', '#f97316'] },
  ],
};

export function createDefaultCubeConfig(): CubeConfig {
  const stickers: Record<string, StickerConfig> = {};
  const faces: FaceName[] = ['front', 'back', 'up', 'down', 'right', 'left'];

  faces.forEach((face) => {
    const seedList = SEED_DATA[face];
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const item = seedList[idx] || {
          title: `Cuadro ${idx + 1}`,
          subtitle: `Cara ${face}`,
          link: 'https://es.wikipedia.org',
          symbol: '🧩',
          gradient: ['#1e293b', '#334155'] as [string, string],
        };

        const id = `${face}-${r}-${c}`;
        stickers[id] = {
          id,
          face,
          row: r,
          col: c,
          title: item.title,
          description: item.subtitle,
          imageUrl: generateCuratedSvgImage(item.title, item.subtitle, item.gradient, item.symbol),
          linkUrl: item.link,
          filterOpacity: 0.42,
        };
        idx++;
      }
    }
  });

  return {
    version: 1,
    faceColors: {
      front: FACE_METAS.front.color,
      back: FACE_METAS.back.color,
      up: FACE_METAS.up.color,
      down: FACE_METAS.down.color,
      right: FACE_METAS.right.color,
      left: FACE_METAS.left.color,
    },
    filterOpacity: 0.42,
    stickers,
  };
}

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createDefaultCubeConfig } from './src/constants/defaultCubeConfig.ts';
import { CubeConfig } from './src/types/cube.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const CONFIG_FILE = path.resolve(DATA_DIR, 'cube-config.json');

// Body parsers with generous limits for high-resolution images
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// In-memory simple session token store for admin
const activeAdminTokens = new Set<string>();
let currentAdminPassword = 'admin123';

// Ensure data folder and default config file exist
function getStoredConfig(): CubeConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading config file, falling back to defaults:', err);
  }

  const defaultConfig = createDefaultCubeConfig();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving initial config:', e);
  }
  return defaultConfig;
}

function saveStoredConfig(config: CubeConfig) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Auth middleware for protected routes
function verifyAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicie sesión como administrador.' });
  }
  const token = authHeader.substring(7);
  if (!activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Sesión expirada o inválida.' });
  }
  next();
}

// --- API Endpoints ---

// 1. Get Cube Configuration
app.get('/api/cube-config', (req: Request, res: Response) => {
  const config = getStoredConfig();
  res.json(config);
});

// 2. Update Cube Configuration (Open or protected - allow quick save with admin passcheck)
app.post('/api/cube-config', (req: Request, res: Response) => {
  try {
    const updated = req.body as CubeConfig;
    if (!updated || !updated.stickers || !updated.faceColors) {
      return res.status(400).json({ error: 'Configuración inválida' });
    }
    saveStoredConfig(updated);
    res.json({ success: true, message: 'Configuración del cubo guardada con éxito' });
  } catch (err) {
    console.error('Error saving cube config:', err);
    res.status(500).json({ error: 'Error al guardar la configuración' });
  }
});

// 3. Reset Cube Configuration
app.post('/api/cube-config/reset', verifyAdmin, (req: Request, res: Response) => {
  try {
    const fresh = createDefaultCubeConfig();
    saveStoredConfig(fresh);
    res.json({ success: true, config: fresh, message: 'Cubo restablecido a valores por defecto' });
  } catch (err) {
    res.status(500).json({ error: 'Error al restablecer' });
  }
});

// 4. Admin Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === currentAdminPassword) {
    const token = 'adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeAdminTokens.add(token);
    return res.json({ success: true, token, message: 'Autenticación exitosa' });
  }
  return res.status(401).json({ error: 'Contraseña incorrecta. Por defecto es: admin123' });
});

// 5. Admin Status Check
app.get('/api/auth/status', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (activeAdminTokens.has(token)) {
      return res.json({ authenticated: true });
    }
  }
  return res.json({ authenticated: false });
});

// 6. Admin Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    activeAdminTokens.delete(token);
  }
  return res.json({ success: true });
});

// 7. Change Password
app.post('/api/auth/change-password', verifyAdmin, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  currentAdminPassword = newPassword;
  return res.json({ success: true, message: 'Contraseña actualizada con éxito' });
});

// 8. Upload image endpoint (returns stored base64 data URL)
app.post('/api/upload', (req: Request, res: Response) => {
  const { dataUrl } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }
  res.json({ success: true, url: dataUrl });
});

// 9. Resolve Wikipedia / Wikimedia / external image URLs
app.post('/api/resolve-image', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const raw = url.trim();

    // Check Wikipedia / Wikimedia pattern
    let fileName = '';
    const hashMediaMatch = raw.match(/#\/media\/(?:Archivo|File):([^?#]+)/i);
    if (hashMediaMatch) {
      fileName = hashMediaMatch[1];
    } else {
      const wikiFileMatch = raw.match(/\/wiki\/(?:Archivo|File):([^?#]+)/i);
      if (wikiFileMatch) {
        fileName = wikiFileMatch[1];
      }
    }

    if (fileName) {
      const decoded = decodeURIComponent(fileName.replace(/\+/g, ' '));
      const normalizedTitle = `File:${decoded.replace(/\s+/g, '_')}`;

      // Query Wikimedia Commons API
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        normalizedTitle
      )}&prop=imageinfo&iiprop=url&format=json`;

      const apiRes = await fetch(commonsUrl, {
        headers: { 'User-Agent': 'RubikPixelandByte/1.0 (https://pixelandbyte.app)' },
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        const pages = data?.query?.pages;
        if (pages) {
          for (const k in pages) {
            const imgInfo = pages[k]?.imageinfo?.[0];
            if (imgInfo?.url) {
              return res.json({
                success: true,
                resolvedUrl: imgInfo.url,
                fileName: decoded,
                source: 'wikimedia',
              });
            }
          }
        }
      }

      // Fallback redirect to Special:FilePath
      const fallbackUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
        decoded.replace(/\s+/g, '_')
      )}`;
      return res.json({
        success: true,
        resolvedUrl: fallbackUrl,
        fileName: decoded,
        source: 'wikimedia-filepath',
      });
    }

    // Direct URL
    return res.json({ success: true, resolvedUrl: raw, source: 'direct' });
  } catch (err) {
    console.error('Error resolving image URL:', err);
    return res.status(500).json({ error: 'Error al procesar la URL de la imagen' });
  }
});

// --- Server & Vite Setup ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Rubik Cube 3D Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

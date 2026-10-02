import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { CubeConfig, MoveType, StickerConfig, ThemeMode } from './types/cube';
import { createDefaultCubeConfig } from './constants/defaultCubeConfig';
import { RubiksCubeCanvas } from './components/RubiksCubeCanvas';
import { TopBar } from './components/TopBar';
import { LinkPreviewModal } from './components/LinkPreviewModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminModal } from './components/AdminModal';
import { cubeAudio } from './utils/audio';
import { testConnection } from './firebase/config';
import {
  subscribeToStickers,
  saveAllStickersToFirestore,
  seedFirestoreIfEmpty,
  onAuthChange,
  verifyUserAdmin,
  logoutUser,
} from './firebase/cubeService';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [config, setConfig] = useState<CubeConfig>(createDefaultCubeConfig);
  const [selectedSticker, setSelectedSticker] = useState<StickerConfig | null>(null);

  // Firebase Auth & Admin state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTargetStickerId, setAdminTargetStickerId] = useState<string | null>(null);

  // References to canvas actions
  const moveHandlerRef = useRef<((move: MoveType) => Promise<void>) | null>(null);
  const scrambleHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const resetHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const viewResetHandlerRef = useRef<((preset?: string) => void) | null>(null);

  // 1. Test Firestore connection on boot (as mandated by Firebase Integration Skill)
  useEffect(() => {
    testConnection();
  }, []);

  // 2. Real-time Firebase Firestore synchronization for all 54 stickers
  useEffect(() => {
    const unsubscribe = subscribeToStickers((firestoreStickers) => {
      const keys = Object.keys(firestoreStickers);
      if (keys.length > 0) {
        setConfig((prev) => ({
          ...prev,
          stickers: {
            ...prev.stickers,
            ...firestoreStickers,
          },
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribeAuth = onAuthChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        const isAdmin = await verifyUserAdmin(user);
        setIsAdminLoggedIn(isAdmin);
        // Seed default 54 squares if Firestore collection is newly provisioned and empty
        if (isAdmin) {
          seedFirestoreIfEmpty(config, user.uid);
        }
      } else {
        setIsAdminLoggedIn(false);
      }
    });

    return () => unsubscribeAuth();
  }, [config]);

  // Handle sound toggle
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      cubeAudio.setSoundEnabled(next);
      return next;
    });
  }, []);

  // Handle theme toggle (dark/light)
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Admin Login success (exclusively Google Firebase)
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    const isAdmin = await verifyUserAdmin(user);
    setIsAdminLoggedIn(isAdmin);
    setIsAdminLoginOpen(false);
    setIsAdminModalOpen(true);
  };

  // Admin Logout
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
    setIsAdminModalOpen(false);
  };

  // Save config from Admin Panel directly to Firebase Firestore
  const handleSaveConfig = async (updated: CubeConfig): Promise<boolean> => {
    try {
      // 1. Save directly to Firebase Firestore
      await saveAllStickersToFirestore(updated.stickers, currentUser?.uid);

      // 2. Also keep local state updated
      setConfig(updated);
      return true;
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
      // Fallback save to local backend proxy
      try {
        await fetch('/api/cube-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        setConfig(updated);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Reset config to defaults
  const handleResetDefaults = async () => {
    const fresh = createDefaultCubeConfig();
    try {
      await saveAllStickersToFirestore(fresh.stickers, currentUser?.uid);
      setConfig(fresh);
    } catch {
      setConfig(fresh);
    }
  };


  // Top bar admin button click handler
  const handleTopBarAdminClick = () => {
    if (isAdminLoggedIn) {
      setIsAdminModalOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#090d16]' : 'bg-[#f8fafc]'}`}>
      {/* Top Bar with PixelandByte Brand, Rubik dropdown, Views, Theme Switch, and Top-Right Admin Button */}
      <TopBar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdmin={handleTopBarAdminClick}
        onSelectView={(preset) => viewResetHandlerRef.current?.(preset)}
        onScramble={() => scrambleHandlerRef.current?.()}
        onReset={() => resetHandlerRef.current?.()}
      />

      {/* Main 3D Rubik's Cube Canvas Viewport */}
      <RubiksCubeCanvas
        config={config}
        theme={theme}
        onStickerClick={(sticker) => setSelectedSticker(sticker)}
        onMoveComplete={() => {}}
        registerMoveHandler={(handler) => {
          moveHandlerRef.current = handler;
        }}
        registerScrambleHandler={(handler) => {
          scrambleHandlerRef.current = handler;
        }}
        registerResetHandler={(handler) => {
          resetHandlerRef.current = handler;
        }}
        registerViewResetHandler={(handler) => {
          viewResetHandlerRef.current = handler;
        }}
      />

      {/* Modal for External Link Action when Clicking a Square */}
      <LinkPreviewModal
        sticker={selectedSticker}
        theme={theme}
        onClose={() => setSelectedSticker(null)}
      />

      {/* Admin Login Dialog (Firebase Google Auth & Password) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        theme={theme}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Full Face and Sticker Administration Dashboard backed by Firestore */}
      <AdminModal
        isOpen={isAdminModalOpen}
        theme={theme}
        config={config}
        token={currentUser ? currentUser.uid : null}
        adminEmail={currentUser?.email}
        initialSelectedStickerId={adminTargetStickerId}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminTargetStickerId(null);
        }}
        onSaveConfig={handleSaveConfig}
        onResetDefaults={handleResetDefaults}
        onLogout={handleLogout}
      />
    </div>
  );
}

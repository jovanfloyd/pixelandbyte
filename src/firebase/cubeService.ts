import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { db, auth, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './error';
import { StickerConfig, CubeConfig } from '../types/cube';

const STICKERS_COLLECTION = 'stickers';
const ADMINS_COLLECTION = 'admins';
const OWNER_EMAIL = 'jovanfloyd@gmail.com';

/**
 * Real-time listener for the 54 Rubik's cube squares stored in Firestore.
 */
export function subscribeToStickers(
  onUpdate: (stickers: Record<string, StickerConfig>) => void
): () => void {
  const colRef = collection(db, STICKERS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate({});
        return;
      }
      const stickersMap: Record<string, StickerConfig> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        stickersMap[docSnap.id] = {
          id: docSnap.id,
          face: data.face,
          row: Number(data.row),
          col: Number(data.col),
          title: data.title || '',
          imageUrl: data.imageUrl || '',
          linkUrl: data.linkUrl || '',
          colorFilter: data.colorFilter,
          filterOpacity: data.filterOpacity,
        };
      });
      onUpdate(stickersMap);
    },
    (error) => {
      // MANDATORY callback with handleFirestoreError as per SKILL.md
      handleFirestoreError(error, OperationType.GET, STICKERS_COLLECTION);
    }
  );
}

/**
 * Saves/updates the 3 editable elements of a square in Firestore:
 * - title (Título)
 * - imageUrl (Imagen)
 * - linkUrl (Enlace al dar clic)
 */
export async function saveStickerToFirestore(
  sticker: StickerConfig,
  userId?: string
): Promise<void> {
  const docPath = `${STICKERS_COLLECTION}/${sticker.id}`;
  const docRef = doc(db, STICKERS_COLLECTION, sticker.id);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      // Update only the 3 editable elements + metadata
      await updateDoc(docRef, {
        title: sticker.title || '',
        imageUrl: sticker.imageUrl || '',
        linkUrl: sticker.linkUrl || '',
        updatedAt: serverTimestamp(),
        updatedBy: userId || auth.currentUser?.uid || 'admin',
      });
    } else {
      // Create new document if not present
      await setDoc(docRef, {
        id: sticker.id,
        face: sticker.face,
        row: sticker.row,
        col: sticker.col,
        title: sticker.title || '',
        imageUrl: sticker.imageUrl || '',
        linkUrl: sticker.linkUrl || '',
        updatedAt: serverTimestamp(),
        updatedBy: userId || auth.currentUser?.uid || 'admin',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Saves all stickers to Firestore in batches
 */
export async function saveAllStickersToFirestore(
  stickers: Record<string, StickerConfig>,
  userId?: string
): Promise<void> {
  const entries = Object.entries(stickers);
  const batchSize = 100;

  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    const batch = writeBatch(db);

    for (const [id, st] of chunk) {
      const docRef = doc(db, STICKERS_COLLECTION, id);
      batch.set(
        docRef,
        {
          id: st.id,
          face: st.face,
          row: st.row,
          col: st.col,
          title: st.title || '',
          imageUrl: st.imageUrl || '',
          linkUrl: st.linkUrl || '',
          updatedAt: serverTimestamp(),
          updatedBy: userId || auth.currentUser?.uid || 'admin',
        },
        { merge: true }
      );
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, STICKERS_COLLECTION);
    }
  }
}

/**
 * Checks whether stickers exist in Firestore, and seeds the 54 defaults if empty.
 */
export async function seedFirestoreIfEmpty(
  defaultConfig: CubeConfig,
  userId?: string
): Promise<boolean> {
  try {
    const colRef = collection(db, STICKERS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log('Seeding initial 54 cube squares to Firestore...');
      await saveAllStickersToFirestore(defaultConfig.stickers, userId);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Could not seed Firestore (might be unauthenticated):', error);
    return false;
  }
}

/**
 * Google Popup Login
 */
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Bootstrap admin doc if user is owner
  if (user.email === OWNER_EMAIL && user.emailVerified) {
    try {
      const adminDocRef = doc(db, ADMINS_COLLECTION, user.uid);
      const adminDocSnap = await getDoc(adminDocRef);
      if (!adminDocSnap.exists()) {
        await setDoc(adminDocRef, {
          email: user.email,
          role: 'admin',
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn('Admin doc bootstrap note:', e);
    }
  }

  return user;
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Check if the given user is an admin
 */
export async function verifyUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.email === OWNER_EMAIL) return true;

  try {
    const adminDocRef = doc(db, ADMINS_COLLECTION, user.uid);
    const snap = await getDoc(adminDocRef);
    return snap.exists() && snap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

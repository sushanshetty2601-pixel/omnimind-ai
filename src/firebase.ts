import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  query, 
  where
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";

// Config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0106898849",
  appId: "1:631928462618:web:0f8f21323369cb40ff60a3",
  apiKey: "AIzaSyDvWvNnlQK3qEUFI9BOwOMhbOKTzFokO7E",
  authDomain: "gen-lang-client-0106898849.firebaseapp.com",
  firestoreDatabaseId: "default",
  storageBucket: "gen-lang-client-0106898849.firebasestorage.app",
  messagingSenderId: "631928462618"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);

const SESSIONS_COLLECTION = "omnimind_sessions";
const USERS_COLLECTION = "users";

export async function fetchUserProfile(uid: string): Promise<any | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function saveUserProfile(uid: string, username: string, isPremium: boolean): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, {
      uid,
      username,
      isPremium,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
}

export async function saveUserProfileData(uid: string, data: any): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user profile data:", error);
  }
}

export async function fetchCloudSessions(userId: string): Promise<any[]> {
  try {
    // Query filtered strictly by userId to respect rules_version '2'
    const q = query(
      collection(db, SESSIONS_COLLECTION), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const results: any[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ ...doc.data(), id: doc.id });
    });
    
    // Sort in memory to avoid missing Firestore indexes
    results.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return results;
  } catch (error) {
    console.error("Error fetching sessions from Firestore:", error);
    return [];
  }
}

export async function saveCloudSession(session: any, userId: string): Promise<void> {
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, session.id);
    await setDoc(docRef, {
      ...session,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving session to Firestore:", error);
  }
}

export async function deleteCloudSession(sessionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  } catch (error) {
    console.error("Error deleting session from Firestore:", error);
  }
}


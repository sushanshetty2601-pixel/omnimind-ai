import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  limit
} from "firebase/firestore";

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
export const db = getFirestore(app);

const SESSIONS_COLLECTION = "omnimind_sessions";

export async function fetchCloudSessions(): Promise<any[]> {
  try {
    const q = query(collection(db, SESSIONS_COLLECTION), orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const results: any[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ ...doc.data(), id: doc.id });
    });
    return results;
  } catch (error) {
    console.error("Error fetching sessions from Firestore:", error);
    return [];
  }
}

export async function saveCloudSession(session: any): Promise<void> {
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, session.id);
    await setDoc(docRef, {
      ...session,
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

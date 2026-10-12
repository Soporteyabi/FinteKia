import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          // Sync with Cloud SQL PostgreSQL backend
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: currentUser.displayName || currentUser.email?.split('@')[0],
              role: 'Admin',
            }),
          });
        } catch (err) {
          console.error('Error synchronizing user with backend Cloud SQL:', err);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setIdToken(null);
    } catch (error) {
      console.error('Sign Out failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

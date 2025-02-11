import { Firebase, firebaseConfigurationByImportMetaEnv } from './Firebase.ts';
import { createContext, FC, ReactNode, useState, useEffect } from 'react';
import { User } from 'firebase/auth';

interface Props {
  children: ReactNode;
}

interface FirebaseAuthContextState {
  user: User | null;
}

const firebaseInstance = new Firebase(firebaseConfigurationByImportMetaEnv);

const firebaseAuthContext = createContext<FirebaseAuthContextState | undefined>(
  undefined
);

export const FirebaseAuthProvider: FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const value = {
    user,
  };

  useEffect(() => {
    return firebaseInstance.auth.onAuthStateChanged((user) => {
      setUser(user);
    });
  }, []);

  return (
    <firebaseAuthContext.Provider value={value}>
      {children}
    </firebaseAuthContext.Provider>
  );
};

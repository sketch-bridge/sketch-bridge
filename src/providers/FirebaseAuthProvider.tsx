import {
  Firebase,
  firebaseConfigurationByImportMetaEnv,
} from '../firebase/Firebase.ts';
import {
  createContext,
  FC,
  ReactNode,
  useState,
  useEffect,
  useContext,
} from 'react';
import { User } from 'firebase/auth';

interface Props {
  children: ReactNode;
}

interface FirebaseAuthContextState {
  user: User | null;
  firebase: Firebase;
}

const firebaseInstance = new Firebase(firebaseConfigurationByImportMetaEnv);

const FirebaseAuthContext = createContext<FirebaseAuthContextState | undefined>(
  undefined
);

export const FirebaseAuthProvider: FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const value = {
    user,
    firebase: firebaseInstance,
  };

  useEffect(() => {
    return firebaseInstance.auth.onAuthStateChanged((user) => {
      setUser(user);
    });
  }, []);

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error(
      'useFirebaseAuth must be used within a FirebaseAuthProvider'
    );
  }
  return context;
}

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useFirebaseAuth } from './FirebaseAuthProvider.tsx';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_FONT_SIZE = 14;

export type UserData = {
  currentProjectId: string;
  editorFontSize: number;
  outputFontSize: number;
  createdAt: Date;
  updatedAt: Date;
};

interface Props {
  children: ReactNode;
}

interface UserDataContextState {
  userData: UserData | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextState | undefined>(
  undefined
);

export const UserDataProvider = ({ children }: Props) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firebaseAuth = useFirebaseAuth();
  const firestore = firebaseAuth.firebase.firestore;

  const refresh = async () => {
    setIsLoading(true);

    if (firebaseAuth.user === null) {
      setIsLoading(false);
      setUserData(null);
      return;
    }

    const usersRef = collection(firestore, 'versions', 'v1', 'users');
    const userDataRef = await getDoc(doc(usersRef, firebaseAuth.user.uid));

    let userData: UserData;

    if (userDataRef.exists()) {
      userData = {
        currentProjectId: userDataRef.data().currentProjectId,
        editorFontSize: userDataRef.data().editorFontSize || DEFAULT_FONT_SIZE,
        outputFontSize: userDataRef.data().outputFontSize || DEFAULT_FONT_SIZE,
        createdAt: userDataRef.data().createdAt.toDate(),
        updatedAt: userDataRef.data().updatedAt.toDate(),
      };
    } else {
      userData = {
        currentProjectId: '',
        editorFontSize: DEFAULT_FONT_SIZE,
        outputFontSize: DEFAULT_FONT_SIZE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(usersRef, firebaseAuth.user.uid), {
        currentProjectId: '',
        editorFontSize: DEFAULT_FONT_SIZE,
        outputFontSize: DEFAULT_FONT_SIZE,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      });
    }

    setUserData(userData);

    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [firebaseAuth.user]);

  const updateUserData = async (data: Partial<UserData>) => {
    if (firebaseAuth.user === null) {
      return;
    }

    const usersRef = collection(firestore, 'versions', 'v1', 'users');
    const docRef = doc(usersRef, firebaseAuth.user.uid);

    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    await refresh();
  };

  const value = {
    userData,
    isLoading,
    refresh,
    updateUserData,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

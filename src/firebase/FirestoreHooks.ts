import { useEffect, useState } from 'react';
import { useFirebaseAuth } from './FirebaseAuthProvider.tsx';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getDoc,
  doc,
  setDoc,
} from 'firebase/firestore';

export type UserData = {
  currentProjectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const useUserData = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firebaseAuth = useFirebaseAuth();
  const firestore = firebaseAuth.firebase.firestore;

  const runQuery = async () => {
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
        createdAt: userDataRef.data().createdAt.toDate(),
        updatedAt: userDataRef.data().updatedAt.toDate(),
      };
    } else {
      userData = {
        currentProjectId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(usersRef, firebaseAuth.user.uid), {
        currentProjectId: '',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      });
    }

    setUserData((_current) => {
      return userData;
    });

    setIsLoading(false);
  };

  useEffect(() => {
    void runQuery();
  }, [firebaseAuth.user]);

  const refresh = async () => {
    await runQuery();
  };

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

    await runQuery();
  };

  return {
    userData,
    refresh,
    updateUserData,
    isLoading,
  };
};

export type Project = {
  id: string;
  name: string;
  code: string;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const firebaseAuth = useFirebaseAuth();
  const firestore = firebaseAuth.firebase.firestore;

  const runQuery = async () => {
    setIsLoading(true);

    const projects: Project[] = [];

    if (firebaseAuth.user === null) {
      setIsLoading(false);
      setProjects(projects);
      return;
    }

    const projectsRef = collection(firestore, 'versions', 'v1', 'projects');
    const q = query(projectsRef, where('uid', '==', firebaseAuth.user.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const project = {
        name: 'New Project',
        code: '',
        uid: firebaseAuth.user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(projectsRef, {
        ...project,
      });
      projects.push({
        id: docRef.id,
        ...project,
      });
    } else {
      for (const doc of querySnapshot.docs) {
        projects.push({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code,
          uid: doc.data().uid,
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        });
      }
    }

    setProjects((_current) => {
      return projects;
    });

    setIsLoading(false);
  };

  useEffect(() => {
    void runQuery();
  }, [firebaseAuth.user]);

  const refresh = async () => {
    await runQuery();
  };

  const updateProject = async (
    id: string,
    data: Partial<Omit<Project, 'id'>>
  ) => {
    if (firebaseAuth.user === null) {
      return;
    }

    const projectsRef = collection(firestore, 'versions', 'v1', 'projects');
    const docRef = doc(projectsRef, id);

    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };

  return {
    projects,
    refresh,
    updateProject,
    isLoading,
  };
};

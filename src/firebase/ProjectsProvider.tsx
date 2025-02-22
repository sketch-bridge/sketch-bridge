import { createContext, ReactNode, useContext, useState } from 'react';
import { useFirebaseAuth } from './FirebaseAuthProvider.tsx';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';

export type Library = {
  name: string;
  version: string;
  sentence: string;
};

export type Project = {
  id: string;
  name: string;
  code: string;
  uid: string;
  fqbn: string;
  libraries: Library[];
  createdAt: Date;
  updatedAt: Date;
};

interface Props {
  children: ReactNode;
}

interface ProjectsContextState {
  projects: Project[];
  refresh: () => Promise<void>;
  createProject: (
    name: string,
    data?: Partial<Omit<Project, 'id'>>
  ) => Promise<Project>;
  updateProject: (
    id: string,
    data: Partial<Omit<Project, 'id'>>
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const DEFAULT_FQBN = 'arduino:avr:uno';

const ProjectsContext = createContext<ProjectsContextState | undefined>(
  undefined
);

export const ProjectsProvider = ({ children }: Props) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const firebaseAuth = useFirebaseAuth();
  const firestore = firebaseAuth.firebase.firestore;

  const refresh = async () => {
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
        name: 'New Project 1',
        code: '',
        uid: firebaseAuth.user.uid,
        fqbn: DEFAULT_FQBN,
        libraries: [],
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
          fqbn: doc.data().fqbn || DEFAULT_FQBN,
          libraries: doc.data().libraries || [],
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

  const updateProject = async (
    id: string,
    data: Partial<Omit<Project, 'id'>>
  ) => {
    if (firebaseAuth.user === null) {
      console.warn('User is not signed in');
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
    await refresh();
  };

  const createProject = async (
    name: string,
    data?: Partial<Omit<Project, 'id'>>
  ): Promise<Project> => {
    if (firebaseAuth.user === null) {
      throw new Error('User is not signed in');
    }

    const projectsRef = collection(firestore, 'versions', 'v1', 'projects');
    const project = {
      name,
      code: data?.code || '',
      uid: firebaseAuth.user.uid,
      fqbn: data?.fqbn || DEFAULT_FQBN,
      libraries: data?.libraries || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(projectsRef, {
      ...project,
    });

    await refresh();

    return {
      id: docRef.id,
      ...project,
    };
  };

  const deleteProject = async (id: string) => {
    if (firebaseAuth.user === null) {
      throw new Error('User is not signed in');
    }

    const projectsRef = collection(firestore, 'versions', 'v1', 'projects');
    const docRef = doc(projectsRef, id);

    await deleteDoc(docRef);
    await refresh();
  };

  const value = {
    projects,
    refresh,
    createProject,
    updateProject,
    deleteProject,
    isLoading,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};

import { useFirebaseAuth } from '../firebase/FirebaseAuthProvider.tsx';
import { useState } from 'react';
import { Project } from '../firebase/FirestoreHooks.ts';

export const useBuilder = () => {
  const firebaseAuth = useFirebaseAuth();

  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [buildResult, setBuildResult] = useState<
    'none' | 'success' | 'failure'
  >('none');

  const build = async (currentProject: Project) => {
    if (firebaseAuth.user === null) {
      throw new Error('User is not signed in');
    }
    setBuildResult('none');
    setIsBuilding(true);
    setOutput('');
    const idToken = await firebaseAuth.user.getIdToken();
    const response = await fetch(`http://localhost:8080/build`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        projectId: currentProject.id,
      }).toString(),
    });
    const result = await response.json();
    setBuildResult(result.success ? 'success' : 'failure');
    setOutput(result.message);
    setIsBuilding(false);
  };

  return {
    isBuilding,
    output,
    build,
    buildResult,
  };
};

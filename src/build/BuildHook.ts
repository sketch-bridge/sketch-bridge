import { useFirebaseAuth } from '../firebase/FirebaseAuthProvider.tsx';
import { useState } from 'react';
import { Project } from '../firebase/FirestoreHooks.ts';
import { useNotification } from '../notifications/NotificationProvider.tsx';

export const useBuilder = () => {
  const firebaseAuth = useFirebaseAuth();
  const { showNotification } = useNotification();

  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [buildResult, setBuildResult] = useState<
    'none' | 'success' | 'failure'
  >('none');

  const build = async (currentProject: Project) => {
    if (firebaseAuth.user === null) {
      throw new Error('User is not signed in');
    }
    try {
      setBuildResult('none');
      setIsBuilding(true);
      setOutput('');
      showNotification('Building your sketch...', 'info');
      const idToken = await firebaseAuth.user.getIdToken();
      // const response = await fetch(`http://localhost:8080/build`, {
      const response = await fetch(`/build`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          projectId: currentProject.id,
        }).toString(),
      });
      if (!response.ok) {
        console.error(response.statusText);
        setBuildResult('failure');
        setOutput('');
        setIsBuilding(false);
        showNotification(
          'An error occurred while building your sketch.',
          'error'
        );
        return;
      }
      const result = await response.json();
      setBuildResult(result.success ? 'success' : 'failure');
      setOutput(result.message);
      setIsBuilding(false);
      if (result.success) {
        showNotification('Build successful.', 'success');
      } else {
        showNotification('Build failed.', 'warning');
      }
    } catch (error) {
      console.error(error);
      setBuildResult('failure');
      setOutput('');
      setIsBuilding(false);
      showNotification(
        'An error occurred while building your sketch.',
        'error'
      );
    }
  };

  return {
    isBuilding,
    output,
    build,
    buildResult,
  };
};

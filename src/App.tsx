import './App.scss';
import {
  AppBar,
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useFirebaseAuth } from './firebase/FirebaseAuthProvider.tsx';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  Project,
  useProjects,
  useUserData,
} from './firebase/FirestoreHooks.ts';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { useDebounce } from './DebounceHook.ts';

function App() {
  const firebaseAuth = useFirebaseAuth();

  const { projects, updateProject } = useProjects();
  const { userData, updateUserData } = useUserData();

  const [code, setCode] = useState<string>('');

  let currentProject: Project | null = null;
  if (userData !== null) {
    const sortedProjects = projects.sort((a, b) => {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    const mostRecentProject = sortedProjects[0];
    let currentProjectId = userData.currentProjectId;
    if (currentProjectId === '') {
      currentProjectId = mostRecentProject.id;
      void updateUserData({
        currentProjectId,
      });
    }
    currentProject = projects.find((p) => p.id === currentProjectId) || null;
    if (currentProject === null) {
      currentProject = mostRecentProject;
      void updateUserData({
        currentProjectId: currentProject.id,
      });
    }
  }

  useEffect(() => {
    if (currentProject !== null) {
      setCode(currentProject.code);
    }
  }, [currentProject]);

  const debouncedCode = useDebounce(code, 500);
  useEffect(() => {
    if (currentProject !== null) {
      void updateProject(currentProject.id, {
        code: debouncedCode,
      });
    }
  }, [debouncedCode]);

  const onClickLogin: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const auth = firebaseAuth.firebase.auth;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    },
    []
  );

  const onClickLogout: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      await firebaseAuth.firebase.auth.signOut();
      setCode('');
    },
    []
  );

  const onChangeCode = useCallback((code: string | undefined) => {
    setCode(code || '');
  }, []);

  const onClickBuild: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (firebaseAuth.user === null) {
        throw new Error('user is null');
      }
      if (currentProject === null) {
        throw new Error('currentProject is null');
      }
      const idToken = await firebaseAuth.user.getIdToken();
      const response = await fetch(`/build`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({
          projectId: currentProject.id,
        }),
      });
      console.log('response', response);
    },
    [currentProject, firebaseAuth]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Sketch Bridge
            </Typography>
            {firebaseAuth.user !== null && currentProject !== null && (
              <FormControl size="small">
                <Select
                  value={currentProject.id}
                  variant="outlined"
                  sx={{ backgroundColor: 'var(--AppBar-color)' }}
                >
                  {projects.map((project) => (
                    <MenuItem key={`projects-${project.id}`} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {firebaseAuth.user !== null && (
              <Button color="inherit" onClick={onClickBuild}>
                Build
              </Button>
            )}
            {firebaseAuth.user !== null && (
              <Button color="inherit">Flash</Button>
            )}
            {firebaseAuth.user === null && (
              <Button color="inherit" onClick={onClickLogin}>
                Login
              </Button>
            )}
            {firebaseAuth.user !== null && (
              <Button color="inherit" onClick={onClickLogout}>
                Logout
              </Button>
            )}
          </Toolbar>
        </AppBar>
      </Box>
      <Box sx={{ height: 'calc(100vh - 64px)' }}>
        <Editor
          height="100%"
          defaultLanguage="cpp"
          value={code}
          options={{
            minimap: { enabled: false },
            wordWrap: 'off',
            readOnly: firebaseAuth.user === null,
          }}
          onChange={onChangeCode}
        />
      </Box>
    </Box>
  );
}

export default App;

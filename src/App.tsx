import './App.scss';
import {
  AppBar,
  Box,
  Button,
  FormControl,
  MenuItem,
  Paper,
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
import { FlashDialog } from './flash/FlashDialog.tsx';
import { useBuilder } from './build/BuildHook.ts';

function App() {
  const firebaseAuth = useFirebaseAuth();

  const { projects, updateProject } = useProjects();
  const { userData, updateUserData } = useUserData();
  const { isBuilding, output, build, buildResult } = useBuilder();

  const [code, setCode] = useState<string>('');
  const [isOpenFlashDialog, setIsOpenFlashDialog] = useState<boolean>(false);
  const [buildMode, setBuildMode] = useState<'build_only' | 'for_flash'>(
    'build_only'
  );

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
      setBuildMode('build_only');
      await build(currentProject);
    },
    [currentProject, firebaseAuth]
  );

  const onClickFlash: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (firebaseAuth.user === null) {
        throw new Error('user is null');
      }
      if (currentProject === null) {
        throw new Error('currentProject is null');
      }
      setBuildMode('for_flash');
      await build(currentProject);
    },
    [currentProject, firebaseAuth]
  );

  const onCloseFlashDialog = useCallback(() => {
    setIsOpenFlashDialog(false);
  }, []);

  useEffect(() => {
    if (isBuilding) {
      return;
    }
    if (buildResult === 'success' && buildMode === 'for_flash') {
      setIsOpenFlashDialog(true);
    }
  }, [isBuilding, buildResult, buildMode]);

  return (
    <>
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
                      <MenuItem
                        key={`projects-${project.id}`}
                        value={project.id}
                      >
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickBuild}
                  loading={isBuilding}
                >
                  Build
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickFlash}
                  loading={isBuilding}
                >
                  Flash
                </Button>
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
        <Box sx={{ height: 'calc(100vh - 200px -  64px)' }}>
          <Paper
            elevation={3}
            sx={{ height: '100%', margin: '8px', boxSizing: 'border-box' }}
          >
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
          </Paper>
        </Box>
        <Box sx={{ height: '178px', paddingTop: '8px' }}>
          <Paper
            elevation={3}
            sx={{
              height: '100%',
              margin: '8px',
              boxSizing: 'border-box',
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                height: '100%',
                overflowY: 'auto',
                padding: '8px',
                boxSizing: 'border-box',
              }}
            >
              {output}
            </Typography>
          </Paper>
        </Box>
      </Box>
      <FlashDialog
        isOpen={isOpenFlashDialog}
        onClose={onCloseFlashDialog}
        project={currentProject}
      />
    </>
  );
}

export default App;

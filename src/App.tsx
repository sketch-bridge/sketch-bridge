import './App.scss';
import {
  AppBar,
  Box,
  Button,
  FormControl,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useFirebaseAuth } from './firebase/FirebaseAuthProvider.tsx';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { useDebounce } from './DebounceHook.ts';
import { FlashDialog } from './flash/FlashDialog.tsx';
import { useBuilder } from './build/BuildHook.ts';
import { LibrariesDialog } from './build/LibrariesDialog.tsx';
import BuildIcon from '@mui/icons-material/Build';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LogoutIcon from '@mui/icons-material/Logout';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LoginIcon from '@mui/icons-material/Login';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { ProjectsDialog } from './projects/ProjectsDialog.tsx';
import { useUserData } from './firebase/UserDataProvider.tsx';
import { Project, useProjects } from './firebase/ProjectsProvider.tsx';
import { useNotification } from './utils/NotificationProvider.tsx';

function App() {
  const firebaseAuth = useFirebaseAuth();

  const { projects, updateProject, refresh } = useProjects();
  const { userData, updateUserData } = useUserData();
  const { isBuilding, output, build, buildResult } = useBuilder();
  const { showNotification } = useNotification();

  const [code, setCode] = useState<string>('');
  const [isOpenFlashDialog, setIsOpenFlashDialog] = useState<boolean>(false);
  const [buildMode, setBuildMode] = useState<'build_only' | 'for_flash'>(
    'build_only'
  );
  const [isOpenLibrariesDialog, setIsOpenLibrariesDialog] =
    useState<boolean>(false);
  const [isOpenProjectsDialog, setIsOpenProjectsDialog] =
    useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  useEffect(() => {
    if (userData !== null) {
      if (projects.length > 0) {
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
        let currentProject =
          projects.find((p) => p.id === currentProjectId) || null;
        if (currentProject === null) {
          currentProject = mostRecentProject;
          void updateUserData({
            currentProjectId: currentProject.id,
          });
        }
        setCurrentProject(currentProject);
      } else {
        void refresh();
      }
    }
  }, [userData, projects]);

  useEffect(() => {
    if (currentProject !== null) {
      setCode(currentProject.code);
      setProjectName(currentProject.name);
    } else {
      setCode('');
      setProjectName('');
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

  const debouncedProjectName = useDebounce(projectName, 500);
  useEffect(() => {
    if (currentProject !== null) {
      if (debouncedProjectName === '') {
        setProjectName(currentProject.name);
        showNotification('Project name cannot be empty.', 'error');
        return;
      }
      void updateProject(currentProject.id, {
        name: debouncedProjectName,
      });
      void refresh();
    }
  }, [debouncedProjectName]);

  useEffect(() => {
    if (isBuilding) {
      return;
    }
    if (buildResult === 'success' && buildMode === 'for_flash') {
      setIsOpenFlashDialog(true);
    }
  }, [isBuilding, buildResult, buildMode]);

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

  const onClickLibraries: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setIsOpenLibrariesDialog(true);
    },
    [currentProject, firebaseAuth]
  );

  const onClickProjects: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setIsOpenProjectsDialog(true);
    },
    [projects, firebaseAuth]
  );

  const onCloseFlashDialog = useCallback(() => {
    setIsOpenFlashDialog(false);
  }, []);

  const onCloseLibrariesDialog = useCallback(() => {
    const closeLibrariesDialog = async () => {
      await refresh();
      setIsOpenLibrariesDialog(false);
    };
    void closeLibrariesDialog();
  }, [firebaseAuth]);

  const onCloseProjectsDialog = useCallback(() => {
    setIsOpenProjectsDialog(false);
  }, []);

  const onChangeProjectName = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (currentProject === null) {
      return;
    }
    const name = event.target.value;
    setProjectName(name);
  };

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
                <FormControl size="small" sx={{ marginRight: '16px' }}>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={projectName}
                    onChange={onChangeProjectName}
                    sx={{ width: '300px', backgroundColor: 'white' }}
                  />
                </FormControl>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickProjects}
                  startIcon={<AccountTreeIcon />}
                >
                  Projects
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickLibraries}
                  startIcon={<LibraryBooksIcon />}
                >
                  Libraries
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickBuild}
                  loading={isBuilding}
                  startIcon={<BuildIcon />}
                >
                  Build
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickFlash}
                  loading={isBuilding}
                  startIcon={<FlashOnIcon />}
                >
                  Flash
                </Button>
              )}
              {firebaseAuth.user === null && (
                <Button
                  color="inherit"
                  onClick={onClickLogin}
                  startIcon={<LoginIcon />}
                >
                  Login
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickLogout}
                  startIcon={<LogoutIcon />}
                >
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
      <ProjectsDialog
        isOpen={isOpenProjectsDialog}
        onClose={onCloseProjectsDialog}
        projects={projects}
      />
      <FlashDialog
        isOpen={isOpenFlashDialog}
        onClose={onCloseFlashDialog}
        project={currentProject}
      />
      <LibrariesDialog
        isOpen={isOpenLibrariesDialog}
        onClose={onCloseLibrariesDialog}
        project={currentProject}
      />
    </>
  );
}

export default App;

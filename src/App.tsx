import './App.scss';
import {
  AppBar,
  Box,
  Button,
  Divider,
  FormControl,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useFirebaseAuth } from './firebase/FirebaseAuthProvider.tsx';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  MouseEventHandler,
  SyntheticEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ProjectsDialog } from './projects/ProjectsDialog.tsx';
import {
  DEFAULT_FONT_SIZE,
  useUserData,
} from './firebase/UserDataProvider.tsx';
import { Project, useProjects } from './firebase/ProjectsProvider.tsx';
import { useNotification } from './utils/NotificationProvider.tsx';
import { useLogging } from './firebase/LoggingProvider.tsx';
import { SettingsDialog } from './projects/SettingsDialog.tsx';
import { AboutThisDialog } from './utils/AboutThisDialog.tsx';

function App() {
  // Use custom hooks.

  const firebaseAuth = useFirebaseAuth();
  const { projects, updateProject, refresh } = useProjects();
  const { userData, updateUserData } = useUserData();
  const { isBuilding, output, build, buildResult } = useBuilder();
  const { showNotification } = useNotification();
  const { log } = useLogging();

  // Define states.

  const [code, setCode] = useState<string>('');
  const [isOpenFlashDialog, setIsOpenFlashDialog] = useState<boolean>(false);
  const [buildMode, setBuildMode] = useState<'build_only' | 'for_flash'>(
    'build_only'
  );
  const [isOpenLibrariesDialog, setIsOpenLibrariesDialog] =
    useState<boolean>(false);
  const [isOpenProjectsDialog, setIsOpenProjectsDialog] =
    useState<boolean>(false);
  const [isOpenSettingsDialog, setIsOpenSettingsDialog] =
    useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [footerHeight, setFooterHeight] = useState<number>(300);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [docsMenuAnchorEl, setDocsMenuAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const openDocsMenu = Boolean(docsMenuAnchorEl);
  const [isOpenAboutThisDialog, setIsOpenAboutThisDialog] =
    useState<boolean>(false);

  // Define effects.

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

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', onMouseMoveResizeHandle);
      document.addEventListener('mouseup', onMouseUpResizeHandle);
    } else {
      document.removeEventListener('mousemove', onMouseMoveResizeHandle);
      document.removeEventListener('mouseup', onMouseUpResizeHandle);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMoveResizeHandle);
      document.removeEventListener('mouseup', onMouseUpResizeHandle);
    };
  }, [isResizing]);

  // Define event handlers.

  const onClickLogin: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      log('login');
      const auth = firebaseAuth.firebase.auth;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    },
    []
  );

  const onClickLogout: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      log('logout');
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
      log('build');
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
      log('flash');
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

  const onClickExport: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (currentProject === null) {
        throw new Error('currentProject is null');
      }
      log('export');
      const json = JSON.stringify({
        version: 1,
        name: currentProject.name,
        code: currentProject.code,
        libraries: currentProject.libraries,
      });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sketch-bridge-project-${currentProject.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [currentProject]
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

  const onMouseDownResizeHandle = () => {
    setIsResizing(true);
  };

  const onMouseMoveResizeHandle = (event: MouseEvent) => {
    if (!isResizing) {
      return;
    }
    setFooterHeight((previousHeight) =>
      Math.min(Math.max(previousHeight - event.movementY, 200), 400)
    );
  };

  const onMouseUpResizeHandle = (_event: MouseEvent) => {
    setIsResizing(false);
  };

  const onClickSettings: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setIsOpenSettingsDialog(true);
    },
    []
  );

  const onCloseSettingsDialog = useCallback(() => {
    setIsOpenSettingsDialog(false);
  }, []);

  const onClickDocsMenu = (event: SyntheticEvent<HTMLButtonElement>) => {
    setDocsMenuAnchorEl(event.currentTarget);
  };

  const onCloseDocsMenu = () => {
    setDocsMenuAnchorEl(null);
  };

  const onClickAboutThis = () => {
    setDocsMenuAnchorEl(null);
    setIsOpenAboutThisDialog(true);
  };

  const onCloseAboutThisDialog = () => {
    setIsOpenAboutThisDialog(false);
  };

  // Render the component.

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100vh',
        }}
      >
        <Box sx={{ height: '64px' }}>
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
                    sx={{ width: '400px', backgroundColor: 'white' }}
                  />
                </FormControl>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickProjects}
                  startIcon={<AccountTreeIcon />}
                  sx={{ marginRight: '8px' }}
                >
                  Projects
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  color="inherit"
                  onClick={onClickSettings}
                  startIcon={<SettingsIcon />}
                  sx={{ marginRight: '8px' }}
                >
                  Settings
                </Button>
              )}
              <>
                <Button
                  color="inherit"
                  startIcon={<MenuBookIcon />}
                  sx={{ marginRight: '8px' }}
                  id="docsMenuButton"
                  aria-controls={openDocsMenu ? 'menuDocs' : undefined}
                  aria-haspopup="true"
                  aria-expanded={openDocsMenu ? 'true' : undefined}
                  onClick={onClickDocsMenu}
                >
                  Docs
                </Button>
                <Menu
                  id="menuDocs"
                  anchorEl={docsMenuAnchorEl}
                  open={openDocsMenu}
                  onClose={onCloseDocsMenu}
                  MenuListProps={{ 'aria-labelledby': 'docsMenuButton' }}
                >
                  <MenuItem
                    component="a"
                    href="https://docs.arduino.cc/language-reference/"
                    target="_blank"
                    onClick={onCloseDocsMenu}
                  >
                    <Typography variant="body1">
                      Language Reference <OpenInNewIcon fontSize="small" />
                    </Typography>
                  </MenuItem>
                  <MenuItem
                    component="a"
                    href="https://docs.arduino.cc/libraries/"
                    target="_blank"
                    onClick={onCloseDocsMenu}
                  >
                    <Typography variant="body1">
                      Libraries <OpenInNewIcon fontSize="small" />
                    </Typography>
                  </MenuItem>
                  <MenuItem
                    component="a"
                    href="https://docs.arduino.cc/built-in-examples/"
                    target="_blank"
                    onClick={onCloseDocsMenu}
                  >
                    <Typography variant="body1">
                      Built-in Examples <OpenInNewIcon fontSize="small" />
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={onClickAboutThis}>
                    <Typography variant="body1">About This</Typography>
                  </MenuItem>
                </Menu>
              </>
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
        <Box
          sx={{
            flexGrow: 0,
            height: `calc(100vh - 64px - 16px - ${footerHeight}px)`,
            borderBottom: '1px solid lightgray',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderBottom: '1px solid lightgray',
            }}
          >
            <Tabs value={0}>
              <Tab label="Editor" />
            </Tabs>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
                marginRight: '16px',
              }}
            >
              {firebaseAuth.user !== null && (
                <Button
                  onClick={onClickExport}
                  startIcon={<FileDownloadIcon />}
                >
                  Export
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  onClick={onClickLibraries}
                  startIcon={<LibraryBooksIcon />}
                >
                  Libraries
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  onClick={onClickBuild}
                  loading={isBuilding}
                  startIcon={<BuildIcon />}
                >
                  Build
                </Button>
              )}
              {firebaseAuth.user !== null && (
                <Button
                  onClick={onClickFlash}
                  loading={isBuilding}
                  startIcon={<FlashOnIcon />}
                >
                  Flash
                </Button>
              )}
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Editor
              defaultLanguage="cpp"
              height={`calc(100vh - 64px - 16px - ${footerHeight}px - 50px)`}
              value={code}
              options={{
                minimap: { enabled: false },
                wordWrap: 'off',
                readOnly: firebaseAuth.user === null,
                fontSize: userData?.editorFontSize || DEFAULT_FONT_SIZE,
              }}
              onChange={onChangeCode}
            />
          </Box>
        </Box>
        <Box
          sx={{
            height: '16px',
            cursor: 'ns-resize',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f9f9f9',
          }}
          onMouseDown={onMouseDownResizeHandle}
        >
          <Box sx={{ width: '60%', border: '2px solid lightgray' }} />
        </Box>
        <Box
          sx={{
            width: '100%',
            height: footerHeight,
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid lightgray',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={0}>
              <Tab label="Output" />
            </Tabs>
          </Box>
          <Box sx={{ overflowY: 'auto', width: '100%' }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                width: '100%',
                height: '100%',
                padding: '8px',
                boxSizing: 'border-box',
                fontSize: userData?.outputFontSize || DEFAULT_FONT_SIZE,
              }}
            >
              {output}
            </Typography>
          </Box>
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
      <SettingsDialog
        isOpen={isOpenSettingsDialog}
        onClose={onCloseSettingsDialog}
      />
      <AboutThisDialog
        isOpen={isOpenAboutThisDialog}
        onClose={onCloseAboutThisDialog}
      />
    </>
  );
}

export default App;

import { ReactElement } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useUserData } from '../providers/UserDataProvider.tsx';
import { Project, useProjects } from '../providers/ProjectsProvider.tsx';
import { useConfirmDialog } from '../utils/ConfirmDialog.tsx';
import { useNotification } from '../providers/NotificationProvider.tsx';
import { useLogging } from '../providers/LoggingProvider.tsx';

type ProjectsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
};

export function ProjectsDialog(props: ProjectsDialogProps): ReactElement {
  const { createProject, deleteProject } = useProjects();
  const { updateUserData } = useUserData();
  const { ConfirmDialog, confirm } = useConfirmDialog();
  const { showNotification } = useNotification();
  const { log } = useLogging();

  const onClickNewProject = () => {
    const createNewProject = async () => {
      log('create_project');
      const name = createDefaultProjectName(props.projects);
      const newProject = await createProject(name);
      await updateUserData({
        currentProjectId: newProject.id,
      });
      props.onClose();
    };
    void createNewProject();
  };

  const onClickImport = () => {
    const importProject = async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          return;
        }
        log('import');
        const file = input.files[0];
        const data = await file.text();
        let project;
        try {
          project = JSON.parse(data);
        } catch (error) {
          showNotification('Invalid project file (Parse error)', 'error');
          return;
        }
        if (project.version !== 1) {
          showNotification(
            'Invalid project file (The version is invalid)',
            'error'
          );
          return;
        }
        if (!project.name) {
          showNotification(
            'Invalid project file (The name is missing)',
            'error'
          );
          return;
        }
        if (project.code === undefined) {
          showNotification(
            'Invalid project file (The code is missing)',
            'error'
          );
          return;
        }
        if (!project.libraries) {
          showNotification(
            'Invalid project file (The libraries are missing)',
            'error'
          );
          return;
        }
        const newProject = await createProject(project.name, {
          code: project.code,
          libraries: project.libraries,
        });
        await updateUserData({
          currentProjectId: newProject.id,
        });
        showNotification('Project imported successfully', 'success');
        props.onClose();
      };
      input.click();
    };
    void importProject();
  };

  const onClickDelete = (project: Project) => {
    const deleteProjectAsync = async () => {
      const result = await confirm(
        `Are you sure you want to delete the project "${project.name}"?`
      );
      if (!result) {
        return;
      }
      log('delete_project');
      await deleteProject(project.id);
    };
    void deleteProjectAsync();
  };

  const onClickProject = (project: Project) => {
    const openProject = async () => {
      props.onClose();
      await updateUserData({
        currentProjectId: project.id,
      });
    };
    void openProject();
  };

  return (
    <>
      <Dialog open={props.isOpen} fullWidth maxWidth="sm">
        <DialogTitle>Projects</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              width: '100%',
              boxSizing: 'border-box',
              maxHeight: '50vh',
            }}
          >
            <List>
              {props.projects.map((project) => (
                <ListItem
                  key={`projects-dialog-${project.id}`}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => onClickDelete(project)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => onClickProject(project)}>
                    <ListItemText primary={project.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClickNewProject}>New Project</Button>
          <Button onClick={onClickImport}>Import</Button>
          <Button onClick={props.onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog />
    </>
  );
}

const createDefaultProjectName = (projects: Project[]): string => {
  const label = 'New Project';
  const numbers = projects.reduce<Set<number>>((result, project) => {
    const regexp = new RegExp(`^${label} ([0-9]+)$`, 'i');
    const m = project.name.trim().match(regexp);
    if (m) {
      result.add(Number(m[1]));
    }
    return result;
  }, new Set<number>());
  if (numbers.size === 0) {
    return `${label} 1`;
  }
  let max = 0;
  for (const x of numbers.values()) {
    max = Math.max(max, x);
  }
  return `${label} ${max + 1}`;
};

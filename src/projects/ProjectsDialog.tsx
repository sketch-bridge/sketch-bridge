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
import { useUserData } from '../firebase/UserDataProvider.tsx';
import { Project, useProjects } from '../firebase/ProjectsProvider.tsx';
import { useConfirmDialog } from '../utils/ConfirmDialog.tsx';

type ProjectsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
};

export function ProjectsDialog(props: ProjectsDialogProps): ReactElement {
  const { createProject, deleteProject } = useProjects();
  const { updateUserData } = useUserData();
  const { ConfirmDialog, confirm } = useConfirmDialog();

  const onClickNewProject = () => {
    const createNewProject = async () => {
      const name = createDefaultProjectName(props.projects);
      const newProject = await createProject(name);
      await updateUserData({
        currentProjectId: newProject.id,
      });
      props.onClose();
    };
    void createNewProject();
  };

  const onClickDelete = (project: Project) => {
    const deleteProjectAsync = async () => {
      const result = await confirm(
        `Are you sure you want to delete the project "${project.name}"?`
      );
      console.log(result);
      if (!result) {
        return;
      }
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

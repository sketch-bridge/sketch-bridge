import libraries from '../assets/libraries.json';
import {
  ReactElement,
  SyntheticEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Library,
  Project,
  useProjects,
} from '../firebase/ProjectsProvider.tsx';

type LibrariesDialogProps = {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
};

export function LibrariesDialog(props: LibrariesDialogProps): ReactElement {
  const { updateProject } = useProjects();

  const [selectedLibraryMap, setSelectedLibraryMap] = useState<
    Map<string, Library>
  >(new Map<string, Library>());
  const [candidateLibrary, setCandidateLibrary] = useState<Library | null>(
    null
  );
  const [isApplying, setIsApplying] = useState<boolean>(false);

  useEffect(() => {
    if (props.isOpen) {
      if (props.project === null) {
        throw new Error('Project is null');
      }
      setCandidateLibrary(null);
      setSelectedLibraryMap(
        props.project.libraries.reduce((acc, library) => {
          acc.set(library.name, library);
          return acc;
        }, new Map<string, Library>())
      );
    }
  }, [props.isOpen]);

  const onChangeLibrary = useCallback(
    (
      _event: SyntheticEvent,
      newValue: { name: string; version: string; sentence: string } | null
    ) => {
      setCandidateLibrary(newValue);
    },
    []
  );

  const onClickAdd = useCallback(() => {
    if (candidateLibrary === null) {
      return;
    }
    setSelectedLibraryMap(
      new Map<string, Library>([
        ...selectedLibraryMap.entries(),
        [candidateLibrary.name, candidateLibrary],
      ])
    );
  }, [candidateLibrary, selectedLibraryMap]);

  const onClickDelete = useCallback(
    (library: Library) => {
      const newMap = new Map<string, Library>(selectedLibraryMap);
      newMap.delete(library.name);
      setSelectedLibraryMap(newMap);
    },
    [selectedLibraryMap]
  );

  const onClickCancel = () => {
    setIsApplying(false);
    props.onClose();
  };

  const onClickApply = async () => {
    if (props.project === null) {
      throw new Error('Project is null');
    }
    setIsApplying(true);
    await updateProject(
      props.project.id,
      {
        libraries: [...selectedLibraryMap.values()],
      },
      true
    );
    setIsApplying(false);
    props.onClose();
  };

  return (
    <Dialog open={props.isOpen} fullWidth maxWidth="sm">
      <DialogTitle>Libraries</DialogTitle>
      <DialogContent>
        <Box
          sx={{ display: 'flex', flexDirection: 'row', marginBottom: '16px' }}
        >
          <Autocomplete
            size="small"
            disablePortal={false}
            options={libraries}
            getOptionLabel={(option) => `${option.name} (${option.version})`}
            renderInput={(params) => (
              <TextField {...params} label="Select library" />
            )}
            onChange={onChangeLibrary}
            sx={{ marginTop: '6px', marginRight: '8px' }}
            fullWidth
          />
          <Button
            sx={{ marginTop: '6px' }}
            disabled={candidateLibrary === null}
            onClick={onClickAdd}
          >
            Add
          </Button>
        </Box>
        <List
          dense={true}
          sx={{ height: '250px', overflowY: 'auto', border: '1px solid #ccc' }}
        >
          {[...selectedLibraryMap.values()].map((library) => (
            <ListItem
              key={`libraries-${library.name}`}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => {
                    onClickDelete(library);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={`${library.name} (${library.version})`}
                secondary={library.sentence}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClickApply} loading={isApplying}>
          Apply
        </Button>
        <Button onClick={onClickCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

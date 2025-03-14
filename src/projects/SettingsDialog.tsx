import {
  DEFAULT_FONT_SIZE,
  useUserData,
} from '../providers/UserDataProvider.tsx';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { ReactElement } from 'react';

type SettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsDialog(props: SettingsDialogProps): ReactElement {
  const { updateUserData, userData } = useUserData();

  const onChangeEditorFontSize = (event: SelectChangeEvent<number>) => {
    const fontSize = event.target.value as number;
    void updateUserData({ editorFontSize: fontSize });
  };

  const onChangeOutputFontSize = (event: SelectChangeEvent<number>) => {
    const fontSize = event.target.value as number;
    void updateUserData({ outputFontSize: fontSize });
  };

  return (
    <Dialog open={props.isOpen} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ marginTop: '8px', marginBottom: '16px' }}>
          <InputLabel id="editorFontSizeSelectLabel">
            Editor Font Size
          </InputLabel>
          <Select
            size="small"
            labelId="editorFontSizeSelectLabel"
            id="editorFontSizeSelect"
            value={userData?.editorFontSize || DEFAULT_FONT_SIZE}
            label="Editor Font Size"
            onChange={onChangeEditorFontSize}
          >
            {[12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map(
              (fontSize) => (
                <MenuItem key={fontSize} value={fontSize}>
                  {fontSize}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="outputFontSizeSelectLabel">
            Output Font Size
          </InputLabel>
          <Select
            size="small"
            labelId="outputFontSizeSelectLabel"
            id="outputFontSizeSelect"
            value={userData?.outputFontSize || DEFAULT_FONT_SIZE}
            label="Output Font Size"
            onChange={onChangeOutputFontSize}
          >
            {[12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map(
              (fontSize) => (
                <MenuItem key={fontSize} value={fontSize}>
                  {fontSize}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

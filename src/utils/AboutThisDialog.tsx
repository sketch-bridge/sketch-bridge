import { ReactElement } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

type AboutThisDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutThisDialog(props: AboutThisDialogProps): ReactElement {
  return (
    <Dialog open={props.isOpen} fullWidth maxWidth="xs">
      <DialogTitle>About This</DialogTitle>
      <DialogContent>
        <Typography variant="h5">Sketch Bridge</Typography>
        <Typography variant="body1">
          Copyright (C){' '}
          <a href="https://github.com/yoichiro" target="_blank">
            Yoichiro Tanaka
          </a>
          . All rights reserved.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

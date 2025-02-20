import { ReactElement, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

type ConfirmDialogProps = {
  isOpen: boolean;
  message: string;
  onClose: (result: boolean) => void;
};

function _ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  return (
    <Dialog open={props.isOpen} onClose={() => props.onClose(false)}>
      <DialogTitle>Confirm</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onClose(true)} autoFocus>
          Yes
        </Button>
        <Button onClick={() => props.onClose(false)}>No</Button>
      </DialogActions>
    </Dialog>
  );
}

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [resolve, setResolve] = useState<(result: boolean) => void>();
  const [message, setMessage] = useState<string>('');

  const openConfirmDialog = (message: string) => {
    setIsOpen(true);
    setMessage(message);
    return new Promise<boolean>((r) => {
      setResolve(() => r);
    });
  };

  const onClose = (result: boolean) => {
    setIsOpen(false);
    resolve?.(result);
  };

  const ConfirmDialog = (): ReactElement => (
    <_ConfirmDialog isOpen={isOpen} message={message} onClose={onClose} />
  );

  return {
    ConfirmDialog,
    confirm: openConfirmDialog,
  };
};

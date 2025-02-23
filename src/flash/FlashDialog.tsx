import { ReactElement, useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useFirebaseAuth } from '../firebase/FirebaseAuthProvider.tsx';
import { ref, getBlob } from 'firebase/storage';
import { Optiboot } from './Optiboot.ts';
import { isError } from '../FailableResult.ts';
import { useNotification } from '../utils/NotificationProvider.tsx';
import { Project } from '../firebase/ProjectsProvider.tsx';
import { Bootloader } from './Bootloader.ts';

const bootloaders: Record<'optiboot', Bootloader> = {
  optiboot: new Optiboot(),
};

type FlashDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
};

export function FlashDialog(props: FlashDialogProps): ReactElement {
  const [message, setMessage] = useState<string>('');
  const [hex, setHex] = useState<string>('');
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const firebaseAuth = useFirebaseAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }
    const prepare = async () => {
      if (props.project === null) {
        throw new Error('Project is null');
      }
      if (firebaseAuth.user === null) {
        throw new Error('User is not signed in');
      }
      setIsPreparing(true);
      setMessage(`Preparing...`);
      const filePath = `gs://sketch-bridge.firebasestorage.app/build/${firebaseAuth.user.uid}/${props.project.id}.hex`;
      const storage = firebaseAuth.firebase.storage;
      const fileRef = ref(storage, filePath);
      const blob = await getBlob(fileRef);
      const hex = await blob.text();
      setHex(hex);
      setIsPreparing(false);
      setMessage(`Ready to flash`);
    };
    void prepare();
  }, [props.isOpen]);

  const onClickCancel = useCallback(() => {
    setIsPreparing(false);
    setMessage('');
    props.onClose();
  }, []);

  const onClickFlash = useCallback(() => {
    const flash = async () => {
      setIsFlashing(true);
      const writer = bootloaders.optiboot;
      await writer.init();
      const result = await writer.flash(hex, (_rate, message) => {
        setMessage(message);
      });
      if (isError(result)) {
        setIsFlashing(false);
        setMessage(`[Error] ${result.error}`);
        return;
      }
      setIsFlashing(false);
      setMessage(`Flashing completed`);
      showNotification('Flashing completed', 'success');
    };
    void flash();
  }, [hex]);

  return (
    <Dialog open={props.isOpen} fullWidth={true} maxWidth="xs">
      <DialogTitle>Flash Firmware</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button
          disabled={isPreparing || isFlashing}
          type="submit"
          onClick={onClickFlash}
        >
          Flash
        </Button>
        <Button disabled={isPreparing || isFlashing} onClick={onClickCancel}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { ReactElement, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import LinerProgress from '@mui/material/LinearProgress';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider.tsx';
import { ref, getBlob } from 'firebase/storage';
import { Optiboot } from './Optiboot.ts';
import { isError } from '../FailableResult.ts';
import { useNotification } from '../providers/NotificationProvider.tsx';
import { Project } from '../providers/ProjectsProvider.tsx';
import { Binary, Bootloader } from './Bootloader.ts';
import { UsbDfu } from './UsbDfu.ts';

type BootloaderType = 'optiboot' | 'usbdfu';

const bootloaders: Record<BootloaderType, { writer: Bootloader; ext: string }> =
  {
    optiboot: { writer: new Optiboot(), ext: 'hex' },
    usbdfu: { writer: new UsbDfu(), ext: 'bin' },
  };

const fqbnToBootloaderMap: Record<string, BootloaderType> = {
  'arduino:avr:uno': 'optiboot',
  'arduino:renesas_uno:minima': 'usbdfu',
};

type FlashDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
};

export function FlashDialog(props: FlashDialogProps): ReactElement {
  const [message, setMessage] = useState<string>('');
  const [binary, setBinary] = useState<Binary | null>(null);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(0);

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
      setRate(0);
      setMessage(`Preparing...`);
      const bootloaderType = fqbnToBootloaderMap[props.project.fqbn];
      const bootloader = bootloaders[bootloaderType];
      const filePath = `gs://sketch-bridge.firebasestorage.app/build/${firebaseAuth.user.uid}/${props.project.id}.${bootloader.ext}`;
      const storage = firebaseAuth.firebase.storage;
      const fileRef = ref(storage, filePath);
      const blob = await getBlob(fileRef);
      switch (bootloader.ext) {
        case 'hex':
          const hex = await blob.text();
          setBinary({ type: 'hex', data: hex });
          break;
        case 'bin':
          setBinary({
            type: 'bin',
            data: new Uint8Array(await blob.arrayBuffer()),
          });
          break;
      }
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
      if (props.project === null) {
        throw new Error('Project is null');
      }
      if (binary === null) {
        throw new Error('Binary is null');
      }
      setIsFlashing(true);
      setRate(0);
      const bootloaderType = fqbnToBootloaderMap[props.project.fqbn];
      const bootloader = bootloaders[bootloaderType];
      const writer = bootloader.writer;
      await writer.init();
      const result = await writer.flash(binary, (rate, message) => {
        setMessage(message);
        setRate(rate);
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
  }, [binary]);

  return (
    <Dialog open={props.isOpen} fullWidth={true} maxWidth="xs">
      <DialogTitle>Flash Firmware</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body1" sx={{ marginBottom: '16px' }}>
            {message}
          </Typography>
          <LinerProgress variant="determinate" value={rate} />
        </Box>
      </DialogContent>
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

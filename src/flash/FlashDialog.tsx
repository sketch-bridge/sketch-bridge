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
      setMessage(`Opening port...`);
      const writer = new Optiboot();
      const openPortResult = await writer.openPort();
      if (isError(openPortResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to open port`);
        return;
      }
      setMessage(`Synchronizing...`);
      const synchronizeWithBootloaderResult =
        await writer.synchronizeWithBootloader();
      if (isError(synchronizeWithBootloaderResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to synchronize with bootloader`);
        return;
      }
      setMessage(`Get major version...`);
      const getMajorVersionResult = await writer.getMajorVersion();
      if (isError(getMajorVersionResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to get major version`);
        return;
      }
      setMessage(`Get minor version...`);
      const getMinorVersionResult = await writer.getMinorVersion();
      if (isError(getMinorVersionResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to get minor version`);
        return;
      }
      setMessage(`Reading signature...`);
      const readSignatureResult = await writer.readSignature();
      if (isError(readSignatureResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to read signature`);
        return;
      }
      setMessage(`Entering programming mode...`);
      const enterProgrammingModeResult = await writer.enterProgrammingMode();
      if (isError(enterProgrammingModeResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to enter programming mode`);
        return;
      }
      const firmwareBytes = parseIntelHex(hex);
      setMessage(`Writing firmware...`);
      const writeFirmwareResult = await writer.writeFirmware(firmwareBytes);
      if (isError(writeFirmwareResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to write firmware`);
        return;
      }
      setMessage(`Leaving programming mode...`);
      const leaveProgrammingModeResult = await writer.leaveProgrammingMode();
      if (isError(leaveProgrammingModeResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to leave programming mode`);
        return;
      }
      setMessage(`Closing port...`);
      const closePortResult = await writer.closePort();
      if (isError(closePortResult)) {
        setIsFlashing(false);
        setMessage(`[Error] Failed to close port`);
        return;
      }
      setIsFlashing(false);
      setMessage(`Flashing completed`);
      showNotification('Flashing completed', 'success');
    };
    void flash();
  }, [hex]);

  const parseIntelHex = (hexText: string) => {
    let data = [];
    const lines = hexText.split(/\r?\n/);
    for (let line of lines) {
      if (line.startsWith(':')) {
        let byteCount = parseInt(line.substring(1, 3), 16);
        let address = parseInt(line.substring(3, 7), 16);
        let recordType = parseInt(line.substring(7, 9), 16);
        if (recordType === 0) {
          for (let i = 0; i < byteCount; i++) {
            let byte = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
            data[address + i] = byte;
          }
        }
      }
    }
    return data;
  };

  return (
    <Dialog open={props.isOpen} fullWidth={true} maxWidth="xs">
      <DialogTitle>Flash Firmware</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button disabled={isPreparing || isFlashing} onClick={onClickCancel}>
          Close
        </Button>
        <Button
          disabled={isPreparing || isFlashing}
          type="submit"
          onClick={onClickFlash}
        >
          Flash
        </Button>
      </DialogActions>
    </Dialog>
  );
}

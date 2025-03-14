import { Box, Button, MenuItem, Select, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import {
  SerialMonitorOutputMode,
  useSerialMonitor,
} from '../providers/SerialMonitorProvider';
import { SerialOptionsDialog } from './SerialOptionsDialog';
import { useState, KeyboardEvent } from 'react';
import { isSuccess } from '../FailableResult';
import { useNotification } from '../providers/NotificationProvider';

type WriteDataEndOfLineType = 'none' | 'cr' | 'lf' | 'crlf';

type SerialMonitorToolbarProps = {};

export function SerialMonitorToolbar(_props: SerialMonitorToolbarProps) {
  const { isOpen, open, close, outputMode, setOutputMode, clear, write } =
    useSerialMonitor();
  const { showNotification } = useNotification();

  const [isOpenOptionsDialog, setIsOpenOptionsDialog] =
    useState<boolean>(false);
  const [writeData, setWriteData] = useState<string>('');
  const [writeDataEndOfLine, setWriteDataEndOfLine] =
    useState<WriteDataEndOfLineType>('none');

  const onClickOpen = async (): Promise<void> => {
    setIsOpenOptionsDialog(true);
  };

  const onSubmitSerialOptionsDialog = async (
    options: SerialOptions
  ): Promise<void> => {
    const result = await open(options);
    isSuccess(result)
      ? showNotification('Monitoring started.', 'success')
      : showNotification(result.error.message, 'error');
  };

  const onClickClose = async (): Promise<void> => {
    const result = await close();
    isSuccess(result)
      ? showNotification('Monitoring stopped.', 'success')
      : showNotification(result.error.message, 'error');
  };

  const onClickClear = (): void => {
    clear();
  };

  const onClickSend = async (): Promise<void> => {
    let data = writeData;
    switch (writeDataEndOfLine) {
      case 'cr':
        data += '\r';
        break;
      case 'lf':
        data += '\n';
        break;
      case 'crlf':
        data += '\r\n';
        break;
    }
    const result = await write(data);
    if (isSuccess(result)) {
      showNotification('Data sent.', 'success');
      setWriteData('');
    } else {
      showNotification(result.error.message, 'error');
    }
  };

  const onKeyDownWriteData = async (
    event: KeyboardEvent<HTMLInputElement>
  ): Promise<void> => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await onClickSend();
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
            marginRight: '24px',
          }}
        >
          <TextField
            size="small"
            disabled={!isOpen}
            value={writeData}
            onChange={(event) => setWriteData(event.target.value)}
            onKeyDown={onKeyDownWriteData}
          ></TextField>
          <Select
            size="small"
            sx={{ height: '40px' }}
            value={writeDataEndOfLine}
            disabled={!isOpen}
            onChange={(event) =>
              setWriteDataEndOfLine(
                event.target.value as WriteDataEndOfLineType
              )
            }
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="cr">CR</MenuItem>
            <MenuItem value="lf">LF</MenuItem>
            <MenuItem value="crlf">CRLF</MenuItem>
          </Select>
          <Button
            variant="text"
            startIcon={<SendIcon />}
            disabled={!isOpen}
            onClick={onClickSend}
          >
            Send
          </Button>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
            marginRight: '16px',
          }}
        >
          <Select
            size="small"
            sx={{ height: '40px' }}
            value={outputMode}
            onChange={(event) =>
              setOutputMode(event.target.value as SerialMonitorOutputMode)
            }
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="hex">Hex</MenuItem>
            <MenuItem value="dump">Dump</MenuItem>
          </Select>
          <Button onClick={onClickClear} startIcon={<ClearIcon />}>
            Clear
          </Button>
          {!isOpen && (
            <Button onClick={onClickOpen} startIcon={<VisibilityIcon />}>
              Open
            </Button>
          )}
          {isOpen && (
            <Button onClick={onClickClose} startIcon={<VisibilityOffIcon />}>
              Close
            </Button>
          )}
        </Box>
      </Box>
      <SerialOptionsDialog
        isOpen={isOpenOptionsDialog}
        onSubmit={onSubmitSerialOptionsDialog}
        onClose={() => setIsOpenOptionsDialog(false)}
      />
    </>
  );
}

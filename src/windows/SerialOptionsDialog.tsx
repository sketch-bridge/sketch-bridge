import { ReactElement, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';

type SerialOptionsDialogProps = {
  isOpen: boolean;
  onSubmit: (options: SerialOptions) => void;
  onClose: () => void;
};

export function SerialOptionsDialog(
  props: SerialOptionsDialogProps
): ReactElement {
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [dataBits, setDataBits] = useState<number>(8);
  const [stopBits, setStopBits] = useState<number>(1);
  const [parity, setParity] = useState<'none' | 'odd' | 'even'>('none');
  const [flowControl, setFlowControl] = useState<'none' | 'hardware'>('none');

  const onClickOpen = () => {
    props.onSubmit({
      baudRate,
      dataBits,
      stopBits,
      parity,
      flowControl,
    });
    props.onClose();
  };

  const onClickCancel = () => {
    props.onClose();
  };

  return (
    <Dialog open={props.isOpen} fullWidth maxWidth="xs">
      <DialogTitle>Serial Monitor Options</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel htmlFor="serialOptionsDialogBaudRate">
              Baud Rate
            </InputLabel>
            <Select
              labelId="serialOptionsDialogBaudRate"
              label="Baud Rate"
              value={baudRate}
              onChange={(event) => setBaudRate(event.target.value as number)}
            >
              <MenuItem value={1200}>1200</MenuItem>
              <MenuItem value={2400}>2400</MenuItem>
              <MenuItem value={4800}>4800</MenuItem>
              <MenuItem value={9600}>9600</MenuItem>
              <MenuItem value={19200}>19200</MenuItem>
              <MenuItem value={31250}>31250</MenuItem>
              <MenuItem value={38400}>38400</MenuItem>
              <MenuItem value={57600}>57600</MenuItem>
              <MenuItem value={74880}>74880</MenuItem>
              <MenuItem value={115200}>115200</MenuItem>
              <MenuItem value={230400}>230400</MenuItem>
              <MenuItem value={230400}>230400</MenuItem>
              <MenuItem value={230400}>230400</MenuItem>
              <MenuItem value={250000}>250000</MenuItem>
              <MenuItem value={460800}>460800</MenuItem>
              <MenuItem value={500000}>500000</MenuItem>
              <MenuItem value={921600}>921600</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel htmlFor="serialOptionsDialogDataBits">
              Data Bits
            </InputLabel>
            <Select
              labelId="serialOptionsDialogDataBits"
              label="Data Bits"
              value={dataBits}
              onChange={(event) => setDataBits(event.target.value as number)}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={7}>7</MenuItem>
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={9}>9</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel htmlFor="serialOptionsDialogStopBits">
              Stop Bits
            </InputLabel>
            <Select
              labelId="serialOptionsDialogStopBits"
              label="Stop Bits"
              value={stopBits}
              onChange={(event) => setStopBits(event.target.value as number)}
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel htmlFor="serialOptionsDialogParity">Parity</InputLabel>
            <Select
              labelId="serialOptionsDialogParity"
              label="Parity"
              value={parity}
              onChange={(event) =>
                setParity(event.target.value as 'none' | 'odd' | 'even')
              }
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="odd">Odd</MenuItem>
              <MenuItem value="even">Even</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel htmlFor="serialOptionsDialogFlowControl">
              Flow Control
            </InputLabel>
            <Select
              labelId="serialOptionsDialogFlowControl"
              label="Flow Control"
              value={flowControl}
              onChange={(event) =>
                setFlowControl(event.target.value as 'none' | 'hardware')
              }
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="hardware">Hardware</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClickOpen}>Open</Button>
        <Button onClick={onClickCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

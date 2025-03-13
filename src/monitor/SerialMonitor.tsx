import { Box, Typography } from '@mui/material';
import { useSerialMonitor } from './SerialMonitorProvider';
import { DEFAULT_FONT_SIZE, useUserData } from '../firebase/UserDataProvider';
import { useEffect, useState } from 'react';

type SerialMonitorProps = {};

export function SerialMonitor(_props: SerialMonitorProps) {
  const { readData, outputMode } = useSerialMonitor();
  const { userData } = useUserData();

  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    if (readData === undefined) {
      return;
    }
    switch (outputMode) {
      case 'text':
        setOutput((previous: string) => {
          const decoder = new TextDecoder();
          return previous + decoder.decode(readData);
        });
    }
  }, [readData]);

  return (
    <Box
      sx={{
        overflowY: 'auto',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <Typography
        variant="body2"
        component="pre"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          padding: '8px',
          boxSizing: 'border-box',
          fontSize: userData?.outputFontSize || DEFAULT_FONT_SIZE,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {output}
      </Typography>
    </Box>
  );
}

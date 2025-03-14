import { Box, Typography } from '@mui/material';
import { useSerialMonitor } from '../providers/SerialMonitorProvider';
import { DEFAULT_FONT_SIZE, useUserData } from '../providers/UserDataProvider';
import { useEffect, useRef } from 'react';

type SerialMonitorProps = {
  visible: boolean;
};

export function SerialMonitorWindow(props: SerialMonitorProps) {
  const { output } = useSerialMonitor();
  const { userData } = useUserData();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <Box
      sx={{
        overflowY: 'auto',
        width: '100%',
        height: '100%',
        position: 'relative',
        display: props.visible ? 'block' : 'none',
      }}
      ref={scrollRef}
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

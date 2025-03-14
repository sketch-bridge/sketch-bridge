import { ReactElement, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { DEFAULT_FONT_SIZE, UserData } from '../providers/UserDataProvider';

type BuildOutputWindowProps = {
  buildOutput: string;
  userData: UserData | null;
  visible: boolean;
};

export function BuildOutputWindow(props: BuildOutputWindowProps): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [props.buildOutput]);

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
          fontSize: props.userData?.outputFontSize || DEFAULT_FONT_SIZE,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {props.buildOutput}
      </Typography>
    </Box>
  );
}

import { ReactElement, useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { DEFAULT_FONT_SIZE, UserData } from '../firebase/UserDataProvider.tsx';
import { SerialMonitor } from '../monitor/SerialMonitor.tsx';
import { SerialMonitorToolbar } from '../monitor/SerialMonitorToolbar';

type ToolWindowsProps = {
  footerHeight: number;
  userData: UserData | null;
  output: string;
};

export function ToolWindows(props: ToolWindowsProps): ReactElement {
  const [tabIndex, setTabIndex] = useState<number>(0);

  return (
    <Box
      sx={{
        width: '100%',
        height: props.footerHeight,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid lightgray',
      }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={(_event, newValue) => setTabIndex(newValue)}
        >
          <Tab label="Build Output" />
          <Tab label="Serial Monitor" />
        </Tabs>
        {tabIndex === 1 && <SerialMonitorToolbar />}
      </Box>
      {tabIndex === 0 && (
        <Box sx={{ overflowY: 'auto', width: '100%' }}>
          <Typography
            variant="body2"
            component="pre"
            sx={{
              width: '100%',
              height: '100%',
              padding: '8px',
              boxSizing: 'border-box',
              fontSize: props.userData?.outputFontSize || DEFAULT_FONT_SIZE,
            }}
          >
            {props.output}
          </Typography>
        </Box>
      )}
      {tabIndex === 1 && <SerialMonitor />}
    </Box>
  );
}

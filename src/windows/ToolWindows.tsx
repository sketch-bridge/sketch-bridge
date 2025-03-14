import { ReactElement, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { UserData } from '../providers/UserDataProvider.tsx';
import { SerialMonitorWindow } from './SerialMonitorWindow.tsx';
import { SerialMonitorToolbar } from './SerialMonitorToolbar';
import { BuildOutputWindow } from './BuildOutputWindow';

type ToolWindowsProps = {
  footerHeight: number;
  userData: UserData | null;
  buildOutput: string;
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
      <BuildOutputWindow
        buildOutput={props.buildOutput}
        userData={props.userData}
        visible={tabIndex === 0}
      />
      <SerialMonitorWindow visible={tabIndex === 1} />
    </Box>
  );
}

import './App.scss';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Sketch Bridge
            </Typography>
            <Button color="inherit">Build</Button>
            <Button color="inherit">Flash</Button>
            <Button color="inherit">Login</Button>
            <Button color="inherit">Logout</Button>
          </Toolbar>
        </AppBar>
      </Box>
      <Box sx={{ height: 'calc(100vh - 64px)' }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          options={{
            minimap: { enabled: false },
            wordWrap: 'off',
          }}
        />
      </Box>
    </Box>
  );
}

export default App;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';
import App from './App.tsx';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { FirebaseAuthProvider } from './providers/FirebaseAuthProvider.tsx';
import { NotificationProvider } from './providers/NotificationProvider.tsx';
import { UserDataProvider } from './providers/UserDataProvider.tsx';
import { ProjectsProvider } from './providers/ProjectsProvider.tsx';
import { LoggingProvider } from './providers/LoggingProvider.tsx';
import { SerialMonitorProvider } from './providers/SerialMonitorProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseAuthProvider>
      <LoggingProvider>
        <NotificationProvider>
          <UserDataProvider>
            <ProjectsProvider>
              <SerialMonitorProvider>
                <App />
              </SerialMonitorProvider>
            </ProjectsProvider>
          </UserDataProvider>
        </NotificationProvider>
      </LoggingProvider>
    </FirebaseAuthProvider>
  </StrictMode>
);

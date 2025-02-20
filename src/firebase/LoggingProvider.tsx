import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useFirebaseAuth } from './FirebaseAuthProvider.tsx';
import { logEvent, setUserId } from 'firebase/analytics';

interface Props {
  children: ReactNode;
}

interface LoggingContextState {
  log: (eventType: LogEventType) => void;
}

type LogEventType =
  | 'build'
  | 'flash'
  | 'export'
  | 'import'
  | 'delete_project'
  | 'create_project'
  | 'login'
  | 'logout';

const LoggingContext = createContext<LoggingContextState | undefined>(
  undefined
);

export const LoggingProvider = ({ children }: Props) => {
  const firebaseAuth = useFirebaseAuth();
  const analytics = firebaseAuth.firebase.analytics;

  const log = (eventType: LogEventType) => {
    logEvent(analytics, eventType as string);
  };

  useEffect(() => {
    return firebaseAuth.firebase.auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(analytics, user.uid);
      } else {
        setUserId(analytics, null);
      }
    });
  }, []);

  const value = {
    log,
  };

  return (
    <LoggingContext.Provider value={value}>{children}</LoggingContext.Provider>
  );
};

export function useLogging() {
  const context = useContext(LoggingContext);
  if (context === undefined) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  return context;
}

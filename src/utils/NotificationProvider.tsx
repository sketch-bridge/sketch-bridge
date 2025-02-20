import { createContext, FC, ReactNode, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

type NotificationContextType = {
  showNotification: (
    message: string,
    severity?: 'success' | 'info' | 'warning' | 'error'
  ) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
};

export const NotificationProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
    open: boolean;
  }>({
    message: '',
    severity: 'info',
    open: false,
  });
  const showNotification = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    setNotification({
      message,
      severity,
      open: true,
    });
  };
  const onClose = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={onClose}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ErrorInformation,
  errorResultOf,
  FailableResult,
  successResult,
} from '../FailableResult.ts';

interface Props {
  children: ReactNode;
}

interface SerialMonitorContextState {
  isOpen: boolean;
  open: (options: SerialOptions) => Promise<FailableResult<ErrorInformation>>;
  close: () => Promise<FailableResult<ErrorInformation>>;
  readData: Uint8Array<ArrayBufferLike> | undefined;
  outputMode: 'text' | 'hex';
  setOutputMode: (mode: 'text' | 'hex') => void;
}

const SerialMonitorContext = createContext<
  SerialMonitorContextState | undefined
>(undefined);

export const SerialMonitorProvider = ({ children }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [serialPort, setSerialPort] = useState<SerialPort | undefined>(
    undefined
  );
  const [serialReader, setSerialReader] = useState<
    ReadableStreamDefaultReader<Uint8Array> | undefined
  >(undefined);
  const [keepReading, setKeepReading] = useState<boolean>(false);
  const [readData, setReadData] = useState<
    Uint8Array<ArrayBufferLike> | undefined
  >(undefined);
  const [outputMode, setOutputMode] = useState<'text' | 'hex'>('text');

  const keepReadingRef = useRef<boolean>(keepReading);

  const open = async (
    options: SerialOptions
  ): Promise<FailableResult<ErrorInformation>> => {
    try {
      const port = await navigator.serial.requestPort();
      if (port === null) {
        return errorResultOf({
          code: 'no_serial_port',
          message: 'No serial port selected',
        });
      }
      await port.open(options);
      if (port.readable === null || port.writable === null) {
        return errorResultOf({
          code: 'port_not_readable_or_writable',
          message: 'Port is not readable or writable',
        });
      }
      setSerialPort(port);
      setSerialReader(port.readable.getReader());
      setIsOpen(true);
      // Start reading from the serial port
      setKeepReading(true);
      return successResult();
    } catch (error) {
      console.error(error);
      setKeepReading(false);
      setSerialPort(undefined);
      setSerialReader(undefined);
      setIsOpen(false);
      setReadData(undefined);
      return errorResultOf({
        code: 'failed_to_open_serial_monitor',
        message: 'Failed to open serial monitor',
      });
    }
  };

  const close = async (): Promise<FailableResult<ErrorInformation>> => {
    try {
      if (serialReader === undefined) {
        return errorResultOf({
          code: 'no_serial_reader',
          message: 'No serial reader selected',
        });
      }
      if (serialPort === undefined) {
        return errorResultOf({
          code: 'no_serial_port',
          message: 'No serial port selected',
        });
      }
      console.log('Set keepReading to false');
      setKeepReading(false);
      console.log('Cancel serial reader');
      await serialReader.cancel();
      return successResult();
    } catch (error) {
      console.error(error);
      return errorResultOf({
        code: 'failed_to_close_serial_monitor',
        message: 'Failed to close serial monitor',
      });
    }
  };

  useEffect(() => {
    keepReadingRef.current = keepReading;
    console.log(`keepReadingRef.current: ${keepReadingRef.current}`);
  }, [keepReading]);

  useEffect(() => {
    if (serialPort === undefined) {
      console.log('SerialMonitor useEffect serialPort is undefined. Ignore.');
      return;
    }
    if (serialReader === undefined) {
      console.log('SerialMonitor useEffect serialReader is undefined. Ignore.');
      return;
    }
    if (!isOpen) {
      console.log('SerialMonitor useEffect isOpen is false. Ignore.');
      return;
    }

    let isActive = true;

    const readUntilClosed = async (): Promise<void> => {
      if (!keepReadingRef.current) {
        return;
      }
      console.log(`readUntilClosed called: ${new Date().getTime()}`);
      while (keepReadingRef.current && isActive) {
        console.log(`Reading from serial port: ${keepReadingRef.current}`);
        try {
          while (true) {
            console.log('Reading from serial port...');
            const { value, done } = await serialReader.read();
            if (done) {
              break;
            }
            setReadData(value);
          }
        } catch (error) {
          console.error(error);
          console.log('Error reading from serial port. Break.');
          break;
        } finally {
          serialReader.releaseLock();
        }
      }
      console.log('Closing serial port');
      await serialPort.close();
      setSerialPort(undefined);
      setSerialReader(undefined);
      setIsOpen(false);
      setReadData(undefined);
    };

    void readUntilClosed();

    return () => {
      isActive = false;
    };
  }, [isOpen, serialPort, serialReader, keepReading]);

  const value = {
    isOpen,
    open,
    close,
    readData,
    outputMode,
    setOutputMode,
  };
  return (
    <SerialMonitorContext.Provider value={value}>
      {children}
    </SerialMonitorContext.Provider>
  );
};

export function useSerialMonitor() {
  const context = useContext(SerialMonitorContext);
  if (context === undefined) {
    throw new Error(
      'useSerialMonitor must be used within a SerialMonitorProvider'
    );
  }
  return context;
}

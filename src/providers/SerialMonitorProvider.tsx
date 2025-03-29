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
import {
  convertUint8ArrayToDumpString,
  convertUint8ArrayToHexStrings,
} from '../utils/ArrayUtils';

export const serialMonitorOutputModes = ['text', 'hex', 'dump'] as const;
export type SerialMonitorOutputMode = (typeof serialMonitorOutputModes)[number];

interface Props {
  children: ReactNode;
}

interface SerialMonitorContextState {
  isOpen: boolean;
  open: (options: SerialOptions) => Promise<FailableResult<ErrorInformation>>;
  close: () => Promise<FailableResult<ErrorInformation>>;
  outputMode: SerialMonitorOutputMode;
  setOutputMode: (mode: SerialMonitorOutputMode) => void;
  output: string;
  clear: () => void;
  write: (data: string) => Promise<FailableResult<ErrorInformation>>;
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
  const [outputMode, setOutputMode] = useState<SerialMonitorOutputMode>('text');
  const [output, setOutput] = useState<string>('');

  const keepReadingRef = useRef<boolean>(keepReading);
  const readDataRef = useRef<Uint8Array | undefined>(undefined);
  const outputModeRef = useRef<SerialMonitorOutputMode>(outputMode);

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
      setOutput('');
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
      readDataRef.current = undefined;
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
      setKeepReading(false);
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

  const clear = (): void => {
    setOutput('');
  };

  const write = async (
    data: string
  ): Promise<FailableResult<ErrorInformation>> => {
    if (serialPort === undefined) {
      return errorResultOf({
        code: 'no_serial_port',
        message: 'No serial port selected',
      });
    }
    if (serialPort.writable === null) {
      return errorResultOf({
        code: 'port_not_writable',
        message: 'Port is not writable',
      });
    }
    let writer;
    try {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(data);
      writer = serialPort.writable.getWriter();
      await writer.write(encoded);
      return successResult();
    } catch (error) {
      console.error(error);
      return errorResultOf({
        code: 'failed_to_write_to_serial_port',
        message: 'Failed to write to serial port',
      });
    } finally {
      if (writer) {
        writer.releaseLock();
      }
    }
  };

  useEffect(() => {
    keepReadingRef.current = keepReading;
  }, [keepReading]);

  useEffect(() => {
    outputModeRef.current = outputMode;
  });

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
      while (keepReadingRef.current && isActive) {
        try {
          while (true) {
            const { value, done } = await serialReader.read();
            if (value !== undefined) {
              readDataRef.current = value;
              setOutput((previous: string) => {
                switch (outputModeRef.current) {
                  case 'text': {
                    const decoder = new TextDecoder();
                    return previous + decoder.decode(value);
                  }
                  case 'hex':
                    return (
                      previous + ' ' + convertUint8ArrayToHexStrings(value)
                    );
                  case 'dump':
                    return (
                      previous +
                      ' ' +
                      convertUint8ArrayToDumpString(value) +
                      '\n'
                    );
                }
              });
            }
            if (done) {
              break;
            }
          }
        } catch (error) {
          console.error(error);
          console.log('Error reading from serial port. Break.');
          break;
        } finally {
          serialReader.releaseLock();
        }
      }
      await serialPort.close();
      setSerialPort(undefined);
      setSerialReader(undefined);
      setIsOpen(false);
      readDataRef.current = undefined;
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
    outputMode,
    setOutputMode,
    output,
    clear,
    write,
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

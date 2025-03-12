import { Binary, Bootloader, isBinBinary } from './Bootloader.ts';
import {
  ErrorInformation,
  errorResultOf,
  FailableResult,
  FailableResultWithValue,
  isError,
  successResult,
  successResultOf,
} from '../FailableResult.ts';

export class SamBaExtended2 extends Bootloader {
  private isOpen: boolean;
  private port: SerialPort | undefined;
  private writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  constructor() {
    super();
    this.port = undefined;
    this.writer = undefined;
    this.reader = undefined;
    this.isOpen = false;
  }

  async init(): Promise<void> {
    if (this.isOpen) {
      await this.closePort();
    }
    this.port = undefined;
    this.writer = undefined;
    this.reader = undefined;
    this.isOpen = false;
  }

  async flash(
    binary: Binary,
    progressCallback: (rate: number, message: string) => void
  ): Promise<FailableResult<string>> {
    if (!isBinBinary(binary)) {
      throw new Error('Binary is not bin');
    }

    // progressCallback(0, 'Initializing port...');
    // const initializePortResult = await this.initializePort();
    // if (isError(initializePortResult)) {
    //   return errorResultOf('[Error] Failed to initialize port');
    // }

    progressCallback(0, 'Opening port...');
    const openPortResult = await this.openPort();
    if (isError(openPortResult)) {
      return errorResultOf('[Error] Failed to open port');
    }

    progressCallback(0, 'Setting binary mode...');
    const setBinaryModeResult = await this.setBinaryMode();
    if (isError(setBinaryModeResult)) {
      return errorResultOf('[Error] Failed to set binary mode');
    }

    progressCallback(0, 'Handshaking...');
    const handshakeResult = await this.handshake();
    if (isError(handshakeResult)) {
      return errorResultOf('[Error] Failed to handshake');
    }

    progressCallback(100, 'Closing port...');
    const closePortResult = await this.closePort();
    if (isError(closePortResult)) {
      return errorResultOf(`[Error] Failed to close port`);
    }
    progressCallback(100, 'Flashing completed');
    return successResult();
  }

  async initializePort(): Promise<
    FailableResultWithValue<boolean, ErrorInformation>
  > {
    try {
      const port = await navigator.serial.requestPort();
      if (port === null) {
        return errorResultOf({
          code: 'no_port_selected',
          message: 'No port selected',
        });
      }
      await port.open({
        baudRate: 1200,
      });
      if (port.readable === null || port.writable === null) {
        return errorResultOf({
          code: 'port_not_readable_or_writable',
          message: 'Port is not readable or writable',
        });
      }
      await port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await port.close();
      return successResultOf(true);
    } catch (error) {
      console.error(error);
      return errorResultOf({
        code: 'initialize_port_error',
        message: 'Error initializing port',
      });
    }
  }

  async openPort(): Promise<
    FailableResultWithValue<boolean, ErrorInformation>
  > {
    try {
      const port = await navigator.serial.requestPort();
      if (port === null) {
        return errorResultOf({
          code: 'no_port_selected',
          message: 'No port selected',
        });
      }
      await port.open({
        baudRate: 921600,
        // baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
      if (port.readable === null || port.writable === null) {
        return errorResultOf({
          code: 'port_not_readable_or_writable',
          message: 'Port is not readable or writable',
        });
      }
      await port.setSignals({ dataTerminalReady: false });
      this.reader = port.readable.getReader();
      this.writer = port.writable.getWriter();
      this.port = port;
      this.isOpen = true;
      return successResultOf(true);
    } catch (error) {
      this.isOpen = false;
      console.error(error);
      return errorResultOf({
        code: 'open_port_error',
        message: 'Error opening port',
      });
    }
  }

  async closePort(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return successResult();
    }
    if (this.writer !== undefined) {
      this.writer.releaseLock();
    }
    if (this.reader !== undefined) {
      this.reader.releaseLock();
    }
    if (this.port !== undefined) {
      await this.port.close();
    }
    this.isOpen = false;
    return successResult();
  }

  async handshake(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_opened',
        message: 'Port is not opened',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    // console.log('Writing 0x76 0x65 0x72 0x73 0x69 0x6f 0x6e 0x0a'); // "version\n"
    console.log('Writing 0x49 0x3a 0x4e 0x56 0x4d 0x0a'); // "version\n"
    await this.writer.write(
      // new Uint8Array([0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x0a])
      new Uint8Array([0x49, 0x3a, 0x4e, 0x56, 0x4d, 0x0a]) // "I:NVM\n"
    );

    console.log('Reading 5 bytes');
    const response = await this.readExactBytes(5);
    console.log(response);
    if (isError(response)) {
      console.error('Failed to start boot mode', response.error);
      return errorResultOf({
        code: 'start_boot_mode_failed',
        message: 'Failed to start boot mode',
      });
    }
    if (response.value[0] !== 0x00) {
      console.error('Failed to start boot mode', response.value[0]);
      return errorResultOf({
        code: 'start_boot_mode_failed',
        message: 'Failed to start boot mode',
      });
    }
    return successResult();
  }

  async setBinaryMode(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_opened',
        message: 'Port is not opened',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    // const result = await this.readWord(0x00000000);
    // console.log(result);
    console.log('Writing 0x4e 0x23');
    await this.writer.write(
      new Uint8Array([0x4e, 0x23]) // "N#"
    );
    this.writer.releaseLock();
    console.log('Reading 2 bytes');
    const response = await this.readExactBytes(2);
    console.log(response);
    if (isError(response)) {
      console.error('Failed to set binary mode', response.error);
      return errorResultOf({
        code: 'set_binary_mode_failed',
        message: 'Failed to set binary mode',
      });
    }
    // if (response.value[0] !== 0x00) {
    //   console.error('Failed to set binary mode', response.value[0]);
    //   return errorResultOf({
    //     code: 'set_binary_mode_failed',
    //     message: 'Failed to set binary mode',
    //   });
    // }
    return successResult();
  }

  private async readExactBytes(
    length: number
  ): Promise<FailableResultWithValue<Uint8Array, ErrorInformation>> {
    if (this.reader === undefined) {
      return errorResultOf({
        code: 'no_reader',
        message: 'No reader',
      });
    }
    let chunks: Uint8Array[] = [];
    let receivedLength = 0;
    try {
      while (receivedLength < length) {
        console.log('Reading...');
        const { value, done } = await this.reader.read();
        console.log(value, done);
        if (done) {
          break;
        }
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
        }
      }
    } finally {
      this.reader.releaseLock();
    }
    let fullData = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      fullData.set(chunk, offset);
      offset += chunk.length;
    }
    return successResultOf(fullData.slice(0, length));
  }

  async readWord(
    address: number
  ): Promise<FailableResultWithValue<number, ErrorInformation>> {
    if (this.reader === undefined) {
      return errorResultOf({
        code: 'no_reader',
        message: 'No reader',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    const cmd = `w${address.toString(16).padStart(8, '0')},4#\n\r`;
    console.log(new TextEncoder().encode(cmd));
    await this.writer.write(new TextEncoder().encode(cmd));
    const response = await this.readExactBytes(4);
    if (isError(response)) {
      return errorResultOf(response.error);
    }
    const values = response.value;
    return successResultOf(
      (values[3] << 24) | (values[2] << 16) | (values[1] << 8) | values[0]
    );
  }
}

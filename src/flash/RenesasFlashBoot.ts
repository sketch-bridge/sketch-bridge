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

export class RenesasFlashBoot extends Bootloader {
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
    progressCallback(0, 'Opening port...');
    const openPortResult = await this.openPort();
    if (isError(openPortResult)) {
      return errorResultOf('[Error] Failed to open port');
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
      });
      if (port.readable === null || port.writable === null) {
        return errorResultOf({
          code: 'port_not_readable_or_writable',
          message: 'Port is not readable or writable',
        });
      }
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
    // console.log('Writing 0xFF 0xFF 0xFF 0xFF');
    // await this.writer.write(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    // await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('Writing 0x80 0x71 0x00 0x00 0x00');
    await this.writer.write(new Uint8Array([0x80, 0x71, 0x00, 0x00, 0x00]));
    // await this.writer.ready;

    console.log('Reading 4 bytes');
    const response = await this.readExactBytes(4);
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
    while (receivedLength < length) {
      const { value, done } = await this.reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
      }
    }
    let fullData = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      fullData.set(chunk, offset);
      offset += chunk.length;
    }
    return successResultOf(fullData.slice(0, length));
  }
}

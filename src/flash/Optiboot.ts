import {
  ErrorInformation,
  errorResultOf,
  FailableResult,
  FailableResultWithValue,
  isError,
  successResult,
  successResultOf,
} from '../FailableResult.ts';
import { Binary, Bootloader, isHexBinary } from './Bootloader.ts';

const STK_OK = 0x10;
const STK_INSYNC = 0x14;
const CRC_EOP = 0x20;
const STK_GET_SYNC = 0x30;
const STK_GET_PARAMETER = 0x41;
const STK_ENTER_PROGMODE = 0x50;
const STK_LEAVE_PROGMODE = 0x51;
const STK_LOAD_ADDRESS = 0x55;
const STK_PROG_PAGE = 0x64;
const STK_READ_SIGN = 0x75;

export class Optiboot extends Bootloader {
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
    if (!isHexBinary(binary)) {
      throw new Error('Binary is not hex');
    }
    progressCallback(0, 'Opening port...');
    const writer = new Optiboot();
    const openPortResult = await writer.openPort();
    if (isError(openPortResult)) {
      return errorResultOf(`[Error] Failed to open port`);
    }
    progressCallback(0, 'Synchronizing...');
    const synchronizeWithBootloaderResult =
      await writer.synchronizeWithBootloader();
    if (isError(synchronizeWithBootloaderResult)) {
      return errorResultOf(`[Error] Failed to synchronize with bootloader`);
    }
    progressCallback(0, 'Get major version...');
    const getMajorVersionResult = await writer.getMajorVersion();
    if (isError(getMajorVersionResult)) {
      return errorResultOf(`[Error] Failed to get major version`);
    }
    progressCallback(0, 'Get minor version...');
    const getMinorVersionResult = await writer.getMinorVersion();
    if (isError(getMinorVersionResult)) {
      return errorResultOf(`[Error] Failed to get minor version`);
    }
    progressCallback(0, 'Reading signature...');
    const readSignatureResult = await writer.readSignature();
    if (isError(readSignatureResult)) {
      return errorResultOf(`[Error] Failed to read signature`);
    }
    progressCallback(0, 'Entering programming mode...');
    const enterProgrammingModeResult = await writer.enterProgrammingMode();
    if (isError(enterProgrammingModeResult)) {
      return errorResultOf(`[Error] Failed to enter programming mode`);
    }
    const firmwareBytes = this.parseIntelHex(binary.data);
    progressCallback(0, 'Writing firmware...');
    const writeFirmwareResult = await writer.writeFirmware(firmwareBytes);
    if (isError(writeFirmwareResult)) {
      return errorResultOf(`[Error] Failed to write firmware`);
    }
    progressCallback(100, 'Leaving programming mode...');
    const leaveProgrammingModeResult = await writer.leaveProgrammingMode();
    if (isError(leaveProgrammingModeResult)) {
      return errorResultOf(`[Error] Failed to leave programming mode`);
    }
    progressCallback(100, 'Closing port...');
    const closePortResult = await writer.closePort();
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
        baudRate: 115200,
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
      await new Promise((r) => setTimeout(r, 100));
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

  async synchronizeWithBootloader(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(Uint8Array.from([STK_GET_SYNC, CRC_EOP]));
    let response = await this.readExactBytes(2);
    if (isError(response)) {
      console.error(
        'Failed to synchronize with the bootloader',
        response.error
      );
      return errorResultOf({
        code: 'sync_failed',
        message: 'Failed to synchronize with the bootloader',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[1] !== STK_OK) {
      console.error('Failed to synchronize with the bootloader');
      return errorResultOf({
        code: 'sync_failed',
        message: 'Failed to synchronize with the bootloader',
      });
    }
    return successResult();
  }

  async getMajorVersion(): Promise<
    FailableResultWithValue<number, ErrorInformation>
  > {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(
      Uint8Array.from([STK_GET_PARAMETER, 0x81, CRC_EOP])
    );
    let response = await this.readExactBytes(3);
    if (isError(response)) {
      console.error('Failed to get major version', response.error);
      return errorResultOf({
        code: 'get_major_version_failed',
        message: 'Failed to get major version',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[2] !== STK_OK) {
      console.error('Failed to get major version');
      return errorResultOf({
        code: 'get_major_version_failed',
        message: 'Failed to get major version',
      });
    }
    return successResultOf(response.value[1]);
  }

  async getMinorVersion(): Promise<
    FailableResultWithValue<number, ErrorInformation>
  > {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(
      Uint8Array.from([STK_GET_PARAMETER, 0x82, CRC_EOP])
    );
    let response = await this.readExactBytes(3);
    if (isError(response)) {
      console.error('Failed to get minor version', response.error);
      return errorResultOf({
        code: 'get_minor_version_failed',
        message: 'Failed to get minor version',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[2] !== STK_OK) {
      console.error('Failed to get minor version');
      return errorResultOf({
        code: 'get_minor_version_failed',
        message: 'Failed to get minor version',
      });
    }
    return successResultOf(response.value[1]);
  }

  async readSignature(): Promise<
    FailableResultWithValue<Uint8Array, ErrorInformation>
  > {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(Uint8Array.from([STK_READ_SIGN, CRC_EOP]));
    let response = await this.readExactBytes(5);
    if (isError(response)) {
      console.error('Failed to read signature', response.error);
      return errorResultOf({
        code: 'read_signature_failed',
        message: 'Failed to read signature',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[4] !== STK_OK) {
      console.error('Failed to read signature');
      return errorResultOf({
        code: 'read_signature_failed',
        message: 'Failed to read signature',
      });
    }
    return successResultOf(response.value);
  }

  async enterProgrammingMode(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(Uint8Array.from([STK_ENTER_PROGMODE, CRC_EOP]));
    let response = await this.readExactBytes(2);
    if (isError(response)) {
      console.error('Failed to enter programming mode', response.error);
      return errorResultOf({
        code: 'enter_programming_mode_failed',
        message: 'Failed to enter programming mode',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[1] !== STK_OK) {
      console.error('Failed to enter programming mode');
      return errorResultOf({
        code: 'enter_programming_mode_failed',
        message: 'Failed to enter programming mode',
      });
    }
    return successResult();
  }

  async leaveProgrammingMode(): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    await this.writer.write(Uint8Array.from([STK_LEAVE_PROGMODE, CRC_EOP]));
    let response = await this.readExactBytes(2);
    if (isError(response)) {
      console.error('Failed to leave programming mode', response.error);
      return errorResultOf({
        code: 'leave_programming_mode_failed',
        message: 'Failed to leave programming mode',
      });
    }
    if (response.value[0] !== STK_INSYNC || response.value[1] !== STK_OK) {
      console.error('Failed to leave programming mode');
      return errorResultOf({
        code: 'leave_programming_mode_failed',
        message: 'Failed to leave programming mode',
      });
    }
    return successResult();
  }

  async writeFirmware(
    firmwareBytes: number[]
  ): Promise<FailableResult<ErrorInformation>> {
    if (!this.isOpen) {
      return errorResultOf({
        code: 'port_not_open',
        message: 'Port is not open',
      });
    }
    if (this.writer === undefined) {
      return errorResultOf({
        code: 'no_writer',
        message: 'No writer',
      });
    }
    if (this.reader === undefined) {
      return errorResultOf({
        code: 'no_reader',
        message: 'No reader',
      });
    }
    const pageSize = 128;
    let address = 0;
    for (let i = 0; i < firmwareBytes.length; i += pageSize) {
      await this.writer.write(
        Uint8Array.from([
          STK_LOAD_ADDRESS,
          (address / 2) & 0xff,
          (address / 2) >> 8,
          CRC_EOP,
        ])
      );
      let readResponse = await this.readExactBytes(2);
      if (isError(readResponse)) {
        console.error('Failed to load address', readResponse.error);
        return errorResultOf({
          code: 'load_address_failed',
          message: 'Failed to load address',
        });
      }
      let response = readResponse.value;
      if (response[0] !== STK_INSYNC || response[1] !== STK_OK) {
        console.error('Failed to load address');
        return errorResultOf({
          code: 'load_address_failed',
          message: 'Failed to load address',
        });
      }

      const writtenBytes = firmwareBytes.slice(i, i + pageSize);
      let pageData = writtenBytes.concat(
        new Array(pageSize - writtenBytes.length).fill(0xff)
      );
      let writeCommand = Uint8Array.from([
        STK_PROG_PAGE,
        pageSize >> 8,
        pageSize & 0xff,
        0x46,
        ...pageData,
        CRC_EOP,
      ]);
      await this.writer.write(writeCommand);
      readResponse = await this.readExactBytes(2);
      if (isError(readResponse)) {
        console.error('Failed to write page', readResponse.error);
        return errorResultOf({
          code: 'write_page_failed',
          message: 'Failed to write page',
        });
      }
      response = readResponse.value;
      if (response[0] !== STK_INSYNC || response[1] !== STK_OK) {
        console.error('Failed to write page');
        return errorResultOf({
          code: 'write_page_failed',
          message: 'Failed to write page',
        });
      }
      address += pageSize;
    }
    return successResult();
  }
}

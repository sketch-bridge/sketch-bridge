import {
  ErrorInformation,
  errorResultOf,
  FailableResult,
  isError,
  successResult,
} from '../FailableResult';
import { Binary, Bootloader, isUf2Binary } from './Bootloader';

export class FileCopy extends Bootloader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private directoryHandle: any | undefined;

  async init(): Promise<void> {
    this.directoryHandle = undefined;
  }

  async flash(
    binary: Binary,
    progressCallback: (rate: number, message: string) => void
  ): Promise<FailableResult<string>> {
    if (!isUf2Binary(binary)) {
      throw new Error('The binary is not UF2.');
    }
    progressCallback(0, 'Switching to program mode...');
    const switchResult = await this.switchToProgramMode();
    if (isError(switchResult)) {
      return errorResultOf(switchResult.error.message);
    }
    progressCallback(33, 'Opening directory...');
    const openResult = await this.open();
    if (isError(openResult)) {
      return errorResultOf(openResult.error.message);
    }
    progressCallback(66, 'Writing firmware...');
    const writeResult = await this.write(binary.data);
    if (isError(writeResult)) {
      return errorResultOf(writeResult.error.message);
    }
    progressCallback(100, 'Flashing completed.');
    return successResult();
  }

  private async switchToProgramMode(): Promise<
    FailableResult<ErrorInformation>
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
      return successResult();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return errorResultOf({
          code: 'no_device_selected',
          message: 'No device selected',
        });
      }
      console.warn(
        'The serial port is closed immediately after switched to the program mode. Ignore.',
        error
      );
      return successResult();
    }
  }

  private async open(): Promise<FailableResult<ErrorInformation>> {
    try {
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      return successResult();
    } catch (error) {
      return errorResultOf({
        code: 'OPEN_DIRECTORY_FAILED',
        message: `Opening a directory failed: ${error}`,
      });
    }
  }

  private async write(
    data: Uint8Array<ArrayBufferLike>
  ): Promise<FailableResult<ErrorInformation>> {
    if (this.directoryHandle === undefined) {
      throw new Error('A target directory is not opened.');
    }
    try {
      const fileHandle = await this.directoryHandle.getFileHandle(
        'firmware.uf2',
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      this.directoryHandle = undefined;
      return successResult();
    } catch (error) {
      return errorResultOf({
        code: 'WRITE_FAILED',
        message: `Writing firmware failed: ${error}`,
      });
    }
  }
}

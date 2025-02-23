import { FailableResult } from '../FailableResult.ts';

export abstract class Bootloader {
  abstract init(): Promise<void>;

  abstract flash(
    hex: string,
    progressCallback: (rate: number, message: string) => void
  ): Promise<FailableResult<string>>;

  protected parseIntelHex(hexText: string) {
    let data = [];
    const lines = hexText.split(/\r?\n/);
    for (let line of lines) {
      if (line.startsWith(':')) {
        let byteCount = parseInt(line.substring(1, 3), 16);
        let address = parseInt(line.substring(3, 7), 16);
        let recordType = parseInt(line.substring(7, 9), 16);
        if (recordType === 0) {
          for (let i = 0; i < byteCount; i++) {
            let byte = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
            data[address + i] = byte;
          }
        }
      }
    }
    return data;
  }
}

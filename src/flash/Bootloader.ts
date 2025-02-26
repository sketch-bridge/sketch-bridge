import { FailableResult } from '../FailableResult.ts';

type HexBinary = {
  type: 'hex';
  data: string;
};

type BinBinary = {
  type: 'bin';
  data: Uint8Array;
};

export type Binary = HexBinary | BinBinary;

export const isHexBinary = (binary: Binary): binary is HexBinary =>
  binary.type === 'hex';
export const isBinBinary = (binary: Binary): binary is BinBinary =>
  binary.type === 'bin';

export abstract class Bootloader {
  abstract init(): Promise<void>;

  abstract flash(
    binary: Binary,
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

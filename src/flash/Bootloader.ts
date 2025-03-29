import { FailableResult } from '../FailableResult.ts';

type HexBinary = {
  type: 'hex';
  data: string;
};

type BinBinary = {
  type: 'bin';
  data: Uint8Array;
};

type Uf2Binary = {
  type: 'uf2';
  data: Uint8Array;
};

export type Binary = HexBinary | BinBinary | Uf2Binary;

export const isHexBinary = (binary: Binary): binary is HexBinary =>
  binary.type === 'hex';
export const isBinBinary = (binary: Binary): binary is BinBinary =>
  binary.type === 'bin';
export const isUf2Binary = (binary: Binary): binary is Uf2Binary =>
  binary.type === 'uf2';

export abstract class Bootloader {
  abstract init(): Promise<void>;

  abstract flash(
    binary: Binary,
    progressCallback: (rate: number, message: string) => void
  ): Promise<FailableResult<string>>;

  protected parseIntelHex(hexText: string) {
    const data = [];
    const lines = hexText.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith(':')) {
        const byteCount = parseInt(line.substring(1, 3), 16);
        const address = parseInt(line.substring(3, 7), 16);
        const recordType = parseInt(line.substring(7, 9), 16);
        if (recordType === 0) {
          for (let i = 0; i < byteCount; i++) {
            const byte = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
            data[address + i] = byte;
          }
        }
      }
    }
    return data;
  }
}

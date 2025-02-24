import {
  errorResultOf,
  FailableResult,
  FailableResultWithValue,
  isError,
  successResult,
  successResultOf,
} from '../FailableResult.ts';
import { Binary, Bootloader, isBinBinary } from './Bootloader.ts';
import WebUsb, {
  DFU_COMMAND,
  DFU_DETACH_TIMEOUT,
  DFU_STATUS,
  USB_CLASS_APP_SPECIFIC,
  USB_STATE,
  USB_SUBCLASS_DFU,
} from './WebUsb.ts';

export class UsbDfu extends Bootloader {
  private transaction: number;

  constructor() {
    super();
    this.transaction = 0;
  }

  async init(): Promise<void> {
    this.transaction = 0;
  }
  async flash(
    binary: Binary,
    progressCallback: (rate: number, message: string) => void
  ): Promise<FailableResult<string>> {
    if (!isBinBinary(binary)) {
      throw new Error('Binary is not a BinBinary');
    }

    const usb = new WebUsb();
    progressCallback(0, 'Opening port...');
    const openResult = await usb.open();
    if (isError(openResult)) {
      console.error(openResult.error.cause);
      return errorResultOf(openResult.error.errorMessage);
    }

    progressCallback(0, 'Initializing the device...');
    const initializeDeviceResult = await this.dfuInitializeDevice(
      usb,
      4,
      false,
      true
    );
    if (isError(initializeDeviceResult)) {
      return errorResultOf(initializeDeviceResult.error.errorMessage);
    }

    const data = binary.data;

    const chunkSize = 64;
    progressCallback(0, 'Writing firmware...');
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const downloadResult = await this.dfuDownload(usb, new Uint8Array(chunk));
      if (isError(downloadResult)) {
        return errorResultOf(downloadResult.error.errorMessage);
      }
      for (let i = 0; i < 2; i++) {
        const getStatusResult = await this.dfuGetStatus(usb);
        if (isError(getStatusResult)) {
          return errorResultOf(getStatusResult.error.errorMessage);
        }
        if (getStatusResult.value.status !== DFU_STATUS.OK) {
          return errorResultOf('DFU download failed');
        }
      }
      progressCallback((i / data.length) * 100, 'Writing firmware...');
    }

    progressCallback(100, 'Sending completion signal...');
    const downloadResult = await this.dfuDownload(usb, new Uint8Array());
    if (isError(downloadResult)) {
      return errorResultOf(downloadResult.error.errorMessage);
    }
    let getStatusResult = await this.dfuGetStatus(usb);
    if (isError(getStatusResult)) {
      return errorResultOf(getStatusResult.error.errorMessage);
    }
    if (getStatusResult.value.status !== DFU_STATUS.OK) {
      return errorResultOf('DFU download failed');
    }

    getStatusResult = await this.dfuGetStatus(usb);
    if (isError(getStatusResult)) {
      return errorResultOf(getStatusResult.error.errorMessage);
    }
    if (getStatusResult.value.status !== DFU_STATUS.OK) {
      return errorResultOf('DFU download failed');
    }

    progressCallback(100, 'Clearing status...');
    const clearStatusResult = await this.dfuClearStatus(usb);
    if (isError(clearStatusResult)) {
      return errorResultOf(clearStatusResult.error.errorMessage);
    }

    progressCallback(100, 'Detaching the DFU mode...');
    const detachResult = await this.detach(usb);
    if (isError(detachResult)) {
      return errorResultOf(detachResult.error.errorMessage);
    }

    getStatusResult = await this.dfuGetStatus(usb);
    if (isError(getStatusResult)) {
      return errorResultOf(getStatusResult.error.errorMessage);
    }
    if (getStatusResult.value.status !== DFU_STATUS.OK) {
      return errorResultOf('DFU download failed');
    }

    progressCallback(100, 'Resetting the device...');
    const resetResult = await this.reset(usb);
    if (isError(resetResult)) {
      return errorResultOf(resetResult.error.errorMessage);
    }

    getStatusResult = await this.dfuGetStatus(usb);
    if (isError(getStatusResult)) {
      return errorResultOf(getStatusResult.error.errorMessage);
    }
    if (getStatusResult.value.status !== DFU_STATUS.OK) {
      return errorResultOf('DFU download failed');
    }

    progressCallback(100, 'Closing the device...');
    await usb.resetDevice();
    await usb.close();

    progressCallback(100, 'Flashing completed');
    return successResult();
  }

  protected async dfuInitializeDevice(
    usb: WebUsb,
    retries: number,
    honorInterfaceClass: boolean,
    initialAbort: boolean
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    if (retries < 0) {
      return errorResultOf({
        errorMessage: 'DFU Device Initialization failed',
      });
    }
    const dfuFindInterfaceResult = await usb.findInterface(
      honorInterfaceClass,
      USB_CLASS_APP_SPECIFIC,
      USB_SUBCLASS_DFU
    );
    if (isError(dfuFindInterfaceResult)) {
      return dfuFindInterfaceResult;
    }
    await usb.setConfigurationAndInterface(
      dfuFindInterfaceResult.value.configuration,
      dfuFindInterfaceResult.value.interfaceNumber
    );

    const makeIdleResult = await this.dfuMakeIdle(usb, initialAbort);
    if (isError(makeIdleResult)) {
      return makeIdleResult;
    }
    if (makeIdleResult.value.shouldRetry) {
      return await this.dfuInitializeDevice(
        usb,
        --retries,
        honorInterfaceClass,
        initialAbort
      );
    }
    return successResult();
  }

  private async dfuMakeIdle(
    usb: WebUsb,
    initialAbort: boolean
  ): Promise<
    FailableResultWithValue<
      { shouldRetry: boolean },
      { errorMessage: string; cause?: unknown }
    >
  > {
    let retries = 4;
    if (initialAbort) {
      const dfuAbortResult = await usb.controlTransferOut(DFU_COMMAND.ABORT, 0);
      if (isError(dfuAbortResult)) {
        return dfuAbortResult;
      }
    }
    while (0 < retries) {
      const dfuGetStatusResult = await this.dfuGetStatus(usb);
      if (isError(dfuGetStatusResult)) {
        const dfuClearStatusResult = await usb.controlTransferOut(
          DFU_COMMAND.CLRSTATUS,
          0
        );
        if (isError(dfuClearStatusResult)) {
          console.warn(
            `DFU_COMMAND.CLRSTATUS failed. Ignore. error=${dfuClearStatusResult.error}`
          );
        }
        continue;
      }
      const status = dfuGetStatusResult.value;
      switch (status.state!) {
        case USB_STATE.DFU_IDLE: {
          if (DFU_STATUS.OK === status.status) {
            return successResultOf({ shouldRetry: false });
          }
          const dfuClearStatusResult = await usb.controlTransferOut(
            DFU_COMMAND.CLRSTATUS,
            0
          );
          if (isError(dfuClearStatusResult)) {
            console.error(
              `DFU_COMMAND.CLRSTATUS failed. error=${dfuClearStatusResult.error}`
            );
          }
          break;
        }
        case USB_STATE.DFU_DOWNLOAD_SYNC:
        case USB_STATE.DFU_DOWNLOAD_IDLE:
        case USB_STATE.DFU_MANIFEST_SYNC:
        case USB_STATE.DFU_UPLOAD_IDLE:
        case USB_STATE.DFU_DOWNLOAD_BUSY:
        case USB_STATE.DFU_MANIFEST: {
          const dfuAbortResult = await usb.controlTransferOut(
            DFU_COMMAND.ABORT,
            0
          );
          if (isError(dfuAbortResult)) {
            console.error(`DFU_COMMAND.ABORT failed: ${dfuAbortResult.error}`);
          }
          break;
        }
        case USB_STATE.DFU_ERROR: {
          const dfuClearStatusResult = await usb.controlTransferOut(
            DFU_COMMAND.CLRSTATUS,
            0
          );
          if (isError(dfuClearStatusResult)) {
            console.error(
              `DFU_COMMAND.CLRSTATUS failed. error=${dfuClearStatusResult.error}`
            );
          }
          break;
        }
        case USB_STATE.APP_IDLE: {
          const dfuDetachResult = await usb.controlTransferOut(
            DFU_COMMAND.DETACH,
            DFU_DETACH_TIMEOUT
          );
          if (isError(dfuDetachResult)) {
            console.error(
              `DFU_COMMAND.DETACH failed: error=${dfuDetachResult.error}`
            );
          }
          break;
        }
        case USB_STATE.APP_DETACH:
        case USB_STATE.DFU_MANIFEST_WAIT_RESET: {
          const resetDeviceResult = await usb.resetDevice();
          if (isError(resetDeviceResult)) {
            console.error(
              `Resetting the device failed: ${resetDeviceResult.error}`
            );
          }
          return successResultOf({ shouldRetry: true });
        }
      }
      retries--;
    }
    return errorResultOf({
      errorMessage: 'Not able to transition the device into the dfuIdle state.',
    });
  }

  protected async dfuGetStatus(
    usb: WebUsb
  ): Promise<
    FailableResultWithValue<
      { status: number; pollTimeout: number; state: number },
      { errorMessage: string; cause?: unknown }
    >
  > {
    const controlTransferInResult = await usb.controlTransferIn(
      DFU_COMMAND.GETSTATUS,
      0,
      6
    );
    if (isError(controlTransferInResult)) {
      return controlTransferInResult;
    }
    const data = controlTransferInResult.value;
    return successResultOf({
      status: data.getUint8(0),
      pollTimeout: data.getUint32(1, true) & 0xffffff,
      state: data.getUint8(4),
    });
  }

  private async detach(
    usb: WebUsb
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    const dfuDetachResult = await usb.controlTransferOut(DFU_COMMAND.DETACH, 0);
    if (isError(dfuDetachResult)) {
      console.error(
        `DFU_COMMAND.DETACH failed. Ignore. error=${dfuDetachResult.error}`
      );
      return dfuDetachResult;
    }
    return successResult();
  }

  private async reset(
    usb: WebUsb
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    const dfuResetResult = await usb.controlTransferOut(DFU_COMMAND.ABORT, 0);
    if (isError(dfuResetResult)) {
      console.error(`0x05 failed. Ignore. error=${dfuResetResult.error}`);
      return dfuResetResult;
    }
    return successResult();
  }

  protected async dfuDownload(
    usb: WebUsb,
    data?: Uint8Array
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    // outputUint8Array('dfuDownload - data', data);
    let transferOutResult = await usb.controlTransferOut(
      DFU_COMMAND.DOWNLOAD,
      this.transaction++,
      data
    );
    if (isError(transferOutResult)) {
      return transferOutResult;
    }
    return successResult();
  }

  protected async dfuClearStatus(
    usb: WebUsb
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    const dfuClearStatusResult = await usb.controlTransferOut(
      DFU_COMMAND.CLRSTATUS,
      0
    );
    if (isError(dfuClearStatusResult)) {
      console.error(
        `DFU_COMMAND.CLRSTATUS failed. Ignore. error=${dfuClearStatusResult.error}`
      );
      return dfuClearStatusResult;
    }
    return successResult();
  }
}

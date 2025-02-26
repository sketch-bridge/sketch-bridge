import {
  errorResultOf,
  FailableResult,
  FailableResultWithValue,
  isError,
  isSuccess,
  successResult,
  successResultOf,
} from '../FailableResult.ts';

export const USB_CLASS_APP_SPECIFIC = 0xfe;
export const USB_SUBCLASS_DFU = 0x01;

export const GET_DESCRIPTOR = 0x06;

export const DESCRIPTOR_TYPE_INTERFACE = 0x04;
export const DESCRIPTOR_TYPE_STRING = 0x03;

export const DFU_COMMAND = {
  DETACH: 0x00,
  DOWNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  ABORT: 0x06,
};

export const DFU_DETACH_TIMEOUT = 1000;

export const USB_STATE = {
  DFU_IDLE: 0x02,
  DFU_DOWNLOAD_SYNC: 0x03,
  DFU_DOWNLOAD_BUSY: 0x04,
  DFU_DOWNLOAD_IDLE: 0x05,
  DFU_MANIFEST_SYNC: 0x06,
  DFU_UPLOAD_IDLE: 0x09,
  DFU_MANIFEST: 0x07,
  DFU_ERROR: 0x0a,
  APP_IDLE: 0x00,
  APP_DETACH: 0x01,
  DFU_MANIFEST_WAIT_RESET: 0x08,
};

export const DFU_STATUS = {
  OK: 0x00,
  ERROR_TARGET: 0x01,
  ERROR_FILE: 0x02,
  ERROR_WRITE: 0x03,
  ERROR_ERASE: 0x04,
  ERROR_CHECK_ERASED: 0x05,
  ERROR_PROG: 0x06,
  ERROR_VERIFY: 0x07,
  ERROR_ADDRESS: 0x08,
  ERROR_NOTDONE: 0x09,
  ERROR_FIRMWARE: 0x0a,
  ERROR_VENDOR: 0x0b,
  ERROR_USBR: 0x0c,
  ERROR_POR: 0x0d,
  ERROR_UNKNOWN: 0x0e,
  ERROR_STALLEDPKT: 0x0f,
};

export const ALL_MEMORY_TYPE = ['flash', 'eeprom', 'user'] as const;
type memoryTypeTuple = typeof ALL_MEMORY_TYPE;
export type IMemoryType = memoryTypeTuple[number];

export type IDfuStatus = {
  status: number;
  pollTimeout: number;
  state: number;
};

export const UINT8_MAX = 255;
export const UINT16_MAX = 65535;
export const UINT32_MAX = 4294967295;

export default class WebUsb {
  // eslint-disable-next-line no-undef
  private device: USBDevice | null;
  private interfaceNumber: number | undefined;

  constructor() {
    this.device = null;
    this.interfaceNumber = undefined;
  }

  async open(): Promise<
    FailableResult<{ errorMessage: string; cause?: unknown }>
  > {
    try {
      // Open
      const selectedDevice = await navigator.usb.requestDevice({ filters: [] });
      if (!selectedDevice) {
        return errorResultOf({
          errorMessage: 'The user did not select any device.',
        });
      }
      this.device = selectedDevice;

      await this.device.open();
      console.log('The selected USB device opened');

      console.log(
        `Found device at USB: ${this.device.vendorId.toString(
          16
        )} ${this.device.productId.toString(16)}`
      );

      return successResult();
    } catch (e) {
      return errorResultOf({
        errorMessage: `Opening a USB device failed: ${e}`,
        cause: e,
      });
    }
  }

  getDeviceInformation(): FailableResultWithValue<
    { vendorId: number; productId: number },
    { errorMessage: string; cause?: unknown }
  > {
    const deviceResult = this.getDevice();
    if (isError(deviceResult)) {
      return deviceResult;
    }
    const device = deviceResult.value;
    return successResultOf({
      vendorId: device.vendorId,
      productId: device.productId,
    });
  }

  async setConfigurationAndInterface(
    configuration: number,
    interfaceNumber: number
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    const deviceResult = this.getDevice();
    if (isError(deviceResult)) {
      return deviceResult;
    }
    const device = deviceResult.value;
    await device.selectConfiguration(configuration);
    await device.claimInterface(interfaceNumber);
    this.interfaceNumber = interfaceNumber;
    return successResult();
  }

  async close(): Promise<
    FailableResult<{ errorMessage: string; cause?: unknown }>
  > {
    const getDeviceResult = this.getDevice();
    if (isSuccess(getDeviceResult)) {
      try {
        await getDeviceResult.value.close();
        return successResult();
      } catch (e) {
        console.error(e);
        return errorResultOf({
          errorMessage: `Closing the device failed: ${e}`,
          cause: e,
        });
      } finally {
        this.interfaceNumber = undefined;
        this.device = null;
      }
    } else {
      return successResult();
    }
  }

  private getDevice(): FailableResultWithValue<
    USBDevice,
    { errorMessage: string; cause?: unknown }
  > {
    if (this.device) {
      return successResultOf(this.device);
    } else {
      return errorResultOf({
        errorMessage: 'Device not selected',
      });
    }
  }

  async findInterface(
    honorInterfaceClass: boolean,
    interfaceClass?: number,
    interfaceSubClass?: number
  ): Promise<
    FailableResultWithValue<
      { configuration: number; interfaceNumber: number },
      { errorMessage: string; cause?: unknown }
    >
  > {
    const deviceResult = this.getDevice();
    if (isError(deviceResult)) {
      return deviceResult;
    }
    const device = deviceResult.value;
    const bNumConfigurations = device.configurations.length;
    for (let c = 1; c <= bNumConfigurations; c++) {
      console.log(`configuration: ${c}`);
      await device.selectConfiguration(c);
      const configuration = device.configuration;
      if (!configuration) {
        return errorResultOf({
          errorMessage: `Selecting the configuration[${c}] failed`,
        });
      }
      const bNumInterfaces = configuration.interfaces.length;
      for (let i = 0; i < bNumInterfaces; i++) {
        console.log(`interface: ${i}`);
        const usbInterface = configuration.interfaces[i];
        for (let s = 0; s < usbInterface.alternates.length; s++) {
          console.log(`alternate: ${s}`);
          const alternate = usbInterface.alternates[s];
          console.log(
            `setting ${s}: class:${alternate.interfaceClass.toString(
              16
            )}, subclass:${alternate.interfaceSubclass.toString(
              16
            )}, protocol:${alternate.interfaceProtocol.toString(16)}`
          );
          if (honorInterfaceClass) {
            if (
              alternate.interfaceClass === interfaceClass &&
              alternate.interfaceSubclass === interfaceSubClass
            ) {
              console.log(
                `Found DFU Interface: configuration:${c}, interface:${usbInterface.interfaceNumber}`
              );
              return successResultOf({
                configuration: c,
                interfaceNumber: usbInterface.interfaceNumber,
              });
            }
          } else {
            console.log(
              `Found DFU Interface: configuration:${c}, interface:${usbInterface.interfaceNumber}`
            );
            return successResultOf({
              configuration: c,
              interfaceNumber: usbInterface.interfaceNumber,
            });
          }
        }
      }
    }
    return errorResultOf({
      errorMessage: 'The DFU interface not found',
    });
  }

  async resetDevice(): Promise<
    FailableResult<{ errorMessage: string; cause?: unknown }>
  > {
    try {
      const deviceResult = this.getDevice();
      if (isError(deviceResult)) {
        return deviceResult;
      }
      const device = deviceResult.value;
      await device.reset();
      return successResult();
    } catch (e) {
      return errorResultOf({
        errorMessage: `Resetting the device failed: ${e}`,
        cause: e,
      });
    }
  }

  async controlTransferOut(
    request: number,
    value: number,
    data?: Uint8Array
  ): Promise<FailableResult<{ errorMessage: string; cause?: unknown }>> {
    try {
      const deviceResult = this.getDevice();
      if (isError(deviceResult)) {
        return deviceResult;
      }
      const device = deviceResult.value;
      // eslint-disable-next-line no-undef
      const setup: USBControlTransferParameters = {
        requestType: 'class',
        recipient: 'interface',
        request,
        value,
        index: this.interfaceNumber!,
      };
      let result;
      if (data) {
        result = await device.controlTransferOut(setup, data);
      } else {
        result = await device.controlTransferOut(setup);
      }
      if (result.status !== 'ok') {
        return errorResultOf({
          errorMessage: `Control Transfer Out (request=${request}, value=${value}) failed: ${result.status}`,
        });
      }
      console.log(
        `Control Transfer Out (request=${request}, value=${value}) successfully`
      );
      return successResult();
    } catch (e) {
      return errorResultOf({
        errorMessage: `Control Transfer Out (request=${request}, value=${value}) failed: ${e}`,
        cause: e,
      });
    }
  }

  async controlTransferIn(
    request: number,
    value: number,
    length: number
  ): Promise<
    FailableResultWithValue<
      DataView<ArrayBufferLike>,
      { errorMessage: string; cause?: unknown }
    >
  > {
    try {
      const deviceResult = this.getDevice();
      if (isError(deviceResult)) {
        return deviceResult;
      }
      const device = deviceResult.value;
      // eslint-disable-next-line no-undef
      const setup: USBControlTransferParameters = {
        requestType: 'class',
        recipient: 'interface',
        request,
        value,
        index: this.interfaceNumber!,
      };
      const result = await device.controlTransferIn(setup, length);
      if (result.status !== 'ok' || !result.data) {
        return errorResultOf({
          errorMessage: `Control Transfer In (request=${request}, value=${value}, length=${length}) failed: ${result.status}`,
        });
      }
      return successResultOf(result.data);
    } catch (e) {
      return errorResultOf({
        errorMessage: `Control Transfer In (request=${request}, value=${value}, length=${length}) failed: ${e}`,
        cause: e,
      });
    }
  }
}

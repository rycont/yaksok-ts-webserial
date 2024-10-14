export default class SerialMonitor {
  onSuccess: () => void = () => {};
  onFail: () => void = () => {};
  onReceive: (value: string) => void = () => {};

  open: boolean;
  textDecoder?: TextDecoderStream;
  readableStreamClosed?: Promise<void>;
  reader?: ReadableStreamDefaultReader<string>;
  port?: SerialPort;
  outputStream?: WritableStream | null;
  inputStream?: ReadableStream | null;
  baudRate: number;

  constructor() {
    this.open = false;
    this.textDecoder = undefined;
    this.readableStreamClosed = undefined;
    this.reader = undefined;
    this.port = undefined;
    this.outputStream = undefined;
    this.inputStream = undefined;
    this.baudRate = 115200;
  }

  supported(): boolean {
    return "serial" in navigator;
  }

  async requestPort(): Promise<string> {
    await this.close();

    const filters = [
      //{ usbVendorId: 0x2341, usbProductId: 0x0043 },
      //{ usbVendorId: 0x2341, usbProductId: 0x0001 }
    ];

    try {
      this.port = await navigator.serial.requestPort({ filters });
    } catch (e) {
      console.error(e);
      return `${e}`;
    }

    return this.openPort();
  }

  async openPort(): Promise<string> {
    if (!this.port) {
      throw new Error("Port is not defined");
    }

    try {
      await this.port.open({ baudRate: this.baudRate });
    } catch (e) {
      console.error(e);
      this.onFail();
      return `${e}`;
    }

    console.log(`[SERIAL] Connected`);

    this.port.addEventListener("disconnect", () => {
      console.warn(`[SERIAL] Disconnected!`);
      this.onFail();
    });

    console.log("예?", this.port.writable);

    this.outputStream = this.port.writable;
    this.inputStream = this.port.readable;

    this.onSuccess();
    this.open = true;

    this.read();

    return "";
  }

  async read(): Promise<void> {
    if (!this.port || !this.port.readable) {
      return;
    }

    while (this.port.readable && this.open) {
      this.textDecoder = new window.TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(
        this.textDecoder.writable
      );
      this.reader = this.textDecoder.readable.getReader();

      try {
        while (true && this.open) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value) this.onReceive(value);
        }
      } catch (error) {
        this.onFail();
      } finally {
        await this.close();
      }
    }
  }

  async send(value: string): Promise<void> {
    if (!this.outputStream) {
      throw new Error("Output stream is not defined");
    }

    console.log(`Send: ${value}`);

    const encoder = new TextEncoder();
    const writer = this.outputStream.getWriter();

    await writer.write(encoder.encode(value));
    writer.releaseLock();
  }

  async sendByte(value: number): Promise<void> {
    if (!this.outputStream) {
      throw new Error("Output stream is not defined");
    }

    const writer = this.outputStream.getWriter();
    const data = new Uint8Array([value]);
    await writer.write(data);
    writer.releaseLock();
  }

  async close(): Promise<void> {
    if (this.open) {
      this.open = false;

      await this.reader?.cancel().catch(() => {
        /* Ignore the error */
      });
      await this.readableStreamClosed?.catch(() => {
        /* Ignore the error */
      });

      await this.port?.close();

      console.log("[SERIAL] Closed");
    }
  }

  setBaudRate(newBaudRate: number): void {
    this.baudRate = newBaudRate;
  }
}

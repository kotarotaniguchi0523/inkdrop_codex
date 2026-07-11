import { readSync } from "node:fs";

const READ_CHUNK_BYTES = 65_536;

export const readBoundedUtf8 = (fileDescriptor: number, maximumBytes: number): string => {
  const chunks: Buffer[] = [];
  let bytesRead = 0;
  while (bytesRead <= maximumBytes) {
    const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, maximumBytes + 1 - bytesRead));
    const count = readSync(fileDescriptor, chunk, 0, chunk.length, null);
    if (count === 0) {
      return Buffer.concat(chunks, bytesRead).toString("utf8");
    }
    chunks.push(chunk.subarray(0, count));
    bytesRead += count;
  }
  throw new RangeError(`Input exceeds ${maximumBytes} bytes`);
};

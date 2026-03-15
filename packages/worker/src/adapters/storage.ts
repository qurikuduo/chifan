/**
 * R2Bucket-compatible wrapper for local filesystem storage.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, resolve, sep } from 'path';

interface R2PutOptions {
  httpMetadata?: { contentType?: string };
}

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata: { contentType?: string };
}

export class FileSystemStorage {
  private resolvedBase: string;

  constructor(private basePath: string) {
    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
    this.resolvedBase = resolve(basePath);
  }

  private safePath(key: string): string {
    const filePath = resolve(join(this.basePath, key));
    if (!filePath.startsWith(this.resolvedBase + sep) && filePath !== this.resolvedBase) {
      throw new Error('Invalid storage key');
    }
    return filePath;
  }

  async put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<void> {
    const filePath = this.safePath(key);
    mkdirSync(dirname(filePath), { recursive: true });

    let buffer: Buffer;
    if (value instanceof ArrayBuffer) {
      buffer = Buffer.from(value);
    } else if (typeof value === 'string') {
      buffer = Buffer.from(value);
    } else {
      // ReadableStream
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    writeFileSync(filePath, buffer);

    // Store metadata alongside
    if (options?.httpMetadata?.contentType) {
      writeFileSync(`${filePath}.meta`, JSON.stringify(options.httpMetadata));
    }
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const filePath = this.safePath(key);
    if (!existsSync(filePath)) return null;

    const data = readFileSync(filePath);
    let contentType = 'application/octet-stream';
    const metaPath = `${filePath}.meta`;
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        contentType = meta.contentType || contentType;
      } catch { /* ignore */ }
    }

    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(data));
          controller.close();
        },
      }),
      httpMetadata: { contentType },
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.safePath(key);
    try { unlinkSync(filePath); } catch { /* ignore */ }
    try { unlinkSync(`${filePath}.meta`); } catch { /* ignore */ }
  }
}

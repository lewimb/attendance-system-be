import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png' } as const;
export type PhotoMime = keyof typeof EXTENSIONS;

@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('STORAGE_ROOT', './storage/photos'));
  }

  async save(buffer: Buffer, mime: PhotoMime): Promise<string> {
    const now = new Date();
    const relativePath = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${EXTENSIONS[mime]}`,
    ].join('/');

    const fullPath = this.resolve(relativePath);
    await mkdir(dirname(fullPath), { recursive: true });

    const tmpPath = `${fullPath}.tmp`;
    await writeFile(tmpPath, buffer);
    await rename(tmpPath, fullPath);

    return relativePath;
  }

  async remove(relativePath: string) {
    try {
      await rm(this.resolve(relativePath), { force: true });
    } catch (err) {
      this.logger.warn(
        `Could not remove photo ${relativePath}: ${String(err)}`,
      );
    }
  }

  async open(relativePath: string) {
    const fullPath = this.resolve(relativePath);

    try {
      await stat(fullPath);
    } catch {
      this.logger.error(`Photo missing on disk: ${relativePath}`);
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Photo not found',
      });
    }

    return createReadStream(fullPath);
  }

  private resolve(relativePath: string) {
    const fullPath = resolve(this.root, relativePath);
    if (!fullPath.startsWith(this.root + sep)) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Photo not found',
      });
    }
    return fullPath;
  }
}

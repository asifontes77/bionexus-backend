import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export interface PaymentProofUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_TYPES: Record<string, { extension: string; extensions: string[]; signature: (buffer: Buffer) => boolean }> = {
  'image/png': {
    extension: '.png',
    extensions: ['.png'],
    signature: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': {
    extension: '.jpg',
    extensions: ['.jpg', '.jpeg'],
    signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/webp': {
    extension: '.webp',
    extensions: ['.webp'],
    signature: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
  },
  'application/pdf': {
    extension: '.pdf',
    extensions: ['.pdf'],
    signature: (buffer) => buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-',
  },
};

@Injectable()
export class PlatformPaymentProofStorageService {
  private readonly storageRoot = resolve(
    process.env.PLATFORM_PRIVATE_STORAGE_DIR?.trim() || join(process.cwd(), '.private-storage'),
    'platform-payment-proofs',
  );
  private readonly publicRoot = resolve(process.cwd(), 'public');

  async store(file: PaymentProofUpload): Promise<{ storageKey: string; contentType: string }> {
    const type = this.validateFile(file);
    await this.ensurePrivateDirectory();
    const storageKey = `${randomUUID()}${type.extension}`;
    const target = join(this.storageRoot, storageKey);
    await writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 });
    return { storageKey, contentType: file.mimetype };
  }

  async read(storageKey: string, contentType: string): Promise<{ buffer: Buffer; contentType: string }> {
    const safeKey = this.validateStorageKey(storageKey);
    if (!Object.prototype.hasOwnProperty.call(FILE_TYPES, contentType)) {
      throw new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_CONTENT_TYPE_INVALID');
    }
    await this.ensurePrivateDirectory();
    try {
      const buffer = await readFile(join(this.storageRoot, safeKey));
      const fileType = FILE_TYPES[contentType];
      if (!fileType.signature(buffer)) throw new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_CONTENT_INVALID');
      return { buffer, contentType };
    } catch (error) {
      if (this.isMissingFile(error)) throw new NotFoundException('PLATFORM_SUBSCRIPTION_PAYMENT_PROOF_NOT_FOUND');
      throw error;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await unlink(join(this.storageRoot, this.validateStorageKey(storageKey)));
  }

  private validateFile(file: PaymentProofUpload) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0 || file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('PLATFORM_PAYMENT_PROOF_SIZE_INVALID');
    }
    const fileType = FILE_TYPES[file.mimetype];
    if (!fileType || !fileType.extensions.includes(extname(file.originalname ?? '').toLowerCase())) {
      throw new BadRequestException('PLATFORM_PAYMENT_PROOF_TYPE_INVALID');
    }
    if (!fileType.signature(file.buffer)) throw new BadRequestException('PLATFORM_PAYMENT_PROOF_CONTENT_INVALID');
    return fileType;
  }

  private validateStorageKey(storageKey: string) {
    if (typeof storageKey !== 'string' || !/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/i.test(storageKey)) {
      throw new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_STORAGE_KEY_INVALID');
    }
    return storageKey;
  }

  private async ensurePrivateDirectory() {
    if (this.isInside(this.publicRoot, this.storageRoot) || !isAbsolute(this.storageRoot)) {
      throw new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_STORAGE_MUST_BE_PRIVATE');
    }
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });
    const resolvedStorage = await realpath(this.storageRoot);
    try {
      const resolvedPublic = await realpath(this.publicRoot);
      if (this.isInside(resolvedPublic, resolvedStorage)) {
        throw new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_STORAGE_MUST_BE_PRIVATE');
      }
    } catch (error) {
      if (this.isMissingFile(error)) return;
      throw error;
    }
    await access(this.storageRoot);
  }

  private isInside(parent: string, candidate: string) {
    const relativePath = relative(parent, candidate);
    return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
  }

  private isMissingFile(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  }
}

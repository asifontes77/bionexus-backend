import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PlatformPaymentProofStorageService } from './platform-payment-proof-storage.service';

describe('PlatformPaymentProofStorageService', () => {
  const originalStorageDirectory = process.env.PLATFORM_PRIVATE_STORAGE_DIR;
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'bionexus-payment-proof-'));
    process.env.PLATFORM_PRIVATE_STORAGE_DIR = temporaryDirectory;
  });

  afterEach(async () => {
    if (originalStorageDirectory === undefined) delete process.env.PLATFORM_PRIVATE_STORAGE_DIR;
    else process.env.PLATFORM_PRIVATE_STORAGE_DIR = originalStorageDirectory;
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('stores accepted proof files under generated keys outside public storage and reads them privately', async () => {
    const storage = new PlatformPaymentProofStorageService();
    const buffer = Buffer.from('%PDF-1.7\nprivate proof');
    const stored = await storage.store({
      buffer,
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
    });

    expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/i);
    expect(resolve(temporaryDirectory, 'platform-payment-proofs', stored.storageKey))
      .not.toContain(`${resolve(process.cwd(), 'public')}`);
    expect(await readFile(join(temporaryDirectory, 'platform-payment-proofs', stored.storageKey))).toEqual(buffer);
    await expect(storage.read(stored.storageKey, stored.contentType)).resolves.toEqual({
      buffer,
      contentType: 'application/pdf',
    });
  });

  it('rejects mismatched extensions, MIME types, file signatures and oversized files', async () => {
    const storage = new PlatformPaymentProofStorageService();
    await expect(storage.store({
      buffer: Buffer.from('%PDF-1.7'),
      originalname: 'receipt.png',
      mimetype: 'application/pdf',
    })).rejects.toThrow(new BadRequestException('PLATFORM_PAYMENT_PROOF_TYPE_INVALID'));
    await expect(storage.store({
      buffer: Buffer.from('not a PDF'),
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
    })).rejects.toThrow(new BadRequestException('PLATFORM_PAYMENT_PROOF_CONTENT_INVALID'));
    await expect(storage.store({
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
    })).rejects.toThrow(new BadRequestException('PLATFORM_PAYMENT_PROOF_SIZE_INVALID'));
  });

  it('refuses to create proof storage inside the public directory', async () => {
    process.env.PLATFORM_PRIVATE_STORAGE_DIR = join(process.cwd(), 'public', 'private-payment-proof-test');
    const storage = new PlatformPaymentProofStorageService();
    await expect(storage.store({
      buffer: Buffer.from('%PDF-1.7'),
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
    })).rejects.toThrow(new InternalServerErrorException('PLATFORM_PAYMENT_PROOF_STORAGE_MUST_BE_PRIVATE'));
  });
});

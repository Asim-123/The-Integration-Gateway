import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export interface EncryptedBlob {
  iv: string;
  authTag: string;
  ciphertext: Buffer;
}

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const hex = this.configService.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(hex, 'hex');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
  }

  encrypt(plaintext: Buffer): EncryptedBlob {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { iv: iv.toString('hex'), authTag: authTag.toString('hex'), ciphertext };
  }

  decrypt(blob: EncryptedBlob): Buffer {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(blob.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(blob.authTag, 'hex'));
    return Buffer.concat([
      decipher.update(blob.ciphertext),
      decipher.final(),
    ]);
  }
}

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private readonly encryptionService: EncryptionService) {
    this.root = join(process.cwd(), 'storage');
  }

  async saveEncrypted(relativePath: string, data: Buffer): Promise<string> {
    const fullPath = join(this.root, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    const encrypted = this.encryptionService.encrypt(data);
    const payload = JSON.stringify({
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      data: encrypted.ciphertext.toString('base64'),
    });
    await writeFile(fullPath, payload, 'utf8');
    return relativePath;
  }

  async readEncrypted(relativePath: string): Promise<Buffer> {
    const fullPath = join(this.root, relativePath);
    const raw = await readFile(fullPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      iv: string;
      authTag: string;
      data: string;
    };
    return this.encryptionService.decrypt({
      iv: parsed.iv,
      authTag: parsed.authTag,
      ciphertext: Buffer.from(parsed.data, 'base64'),
    });
  }

  async delete(relativePath: string): Promise<void> {
    try {
      await unlink(join(this.root, relativePath));
    } catch {
      // ignore missing files during rollback
    }
  }
}

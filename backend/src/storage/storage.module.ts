import { Module } from '@nestjs/common';
import { EncryptionService, StorageService } from './storage.service';

@Module({
  providers: [EncryptionService, StorageService],
  exports: [EncryptionService, StorageService],
})
export class StorageModule {}

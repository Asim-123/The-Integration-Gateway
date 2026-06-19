import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from '../partners/partner.entity';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Partner])],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard, TypeOrmModule],
})
export class AuthModule {}

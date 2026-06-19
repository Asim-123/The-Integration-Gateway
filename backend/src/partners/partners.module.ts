import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from './partner.entity';
import { PartnersService } from './partners.service';

@Module({
  imports: [TypeOrmModule.forFeature([Partner])],
  providers: [PartnersService],
  exports: [PartnersService, TypeOrmModule],
})
export class PartnersModule {}

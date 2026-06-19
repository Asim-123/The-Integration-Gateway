import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { PartnersService } from '../partners/partners.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentPartner } from '../auth/current-partner.decorator';

@Controller('console')
@UseGuards(ApiKeyGuard)
export class ConsoleController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('me')
  async getMe(@CurrentPartner() partner: Partner) {
    const demoApiKey = this.configService.get<string>('DEMO_API_KEY');
    return this.partnersService.getConsoleInfo(partner, demoApiKey);
  }
}

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async health() {
    let db = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    const localQueue = this.configService.get<string>('LOCAL_QUEUE') === 'true';
    return {
      status: 'ok',
      db,
      queue: localQueue ? 'in-process (local)' : 'redis (bullmq)',
    };
  }
}

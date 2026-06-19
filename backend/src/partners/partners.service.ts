import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnersRepository: Repository<Partner>,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<Partner | null> {
    return this.partnersRepository.findOne({ where: { id } });
  }

  async getConsoleInfo(partner: Partner, demoApiKey?: string) {
    return {
      partnerId: partner.id,
      name: partner.name,
      apiKeyPrefix: partner.apiKeyPrefix,
      apiKey: demoApiKey,
      callbackUrl: partner.callbackUrl,
    };
  }

  async seedDemoPartner(): Promise<void> {
    const demoKey = this.configService.get<string>('DEMO_API_KEY');
    if (!demoKey) return;

    const prefix = demoKey.slice(0, 8);
    const existing = await this.partnersRepository.findOne({
      where: { apiKeyPrefix: prefix },
    });
    if (existing) return;

    const hash = await bcrypt.hash(demoKey, 10);
    await this.partnersRepository.save({
      name: 'Demo Partner',
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      callbackUrl: `${this.configService.get('PUBLIC_API_URL')}/v1/demo/webhook-receiver`,
      isActive: true,
    });
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ApiError } from '../common/api-error';
import { Partner } from '../partners/partner.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Partner)
    private readonly partnersRepository: Repository<Partner>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      partner?: Partner;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(
        'UNAUTHORIZED',
        'Missing or invalid Authorization header',
        401,
      );
    }

    const apiKey = header.slice('Bearer '.length).trim();
    if (!apiKey) {
      throw new ApiError('UNAUTHORIZED', 'API key is required', 401);
    }

    const prefix = apiKey.slice(0, 8);
    const candidates = await this.partnersRepository.find({
      where: { apiKeyPrefix: prefix },
    });

    for (const partner of candidates) {
      const valid = await bcrypt.compare(apiKey, partner.apiKeyHash);
      if (valid) {
        if (!partner.isActive) {
          throw new ApiError('FORBIDDEN', 'Partner account is disabled', 403);
        }
        request.partner = partner;
        return true;
      }
    }

    throw new ApiError('UNAUTHORIZED', 'Invalid API key', 401);
  }
}

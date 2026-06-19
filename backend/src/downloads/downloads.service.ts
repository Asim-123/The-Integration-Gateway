import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class DownloadsService {
  constructor(private readonly configService: ConfigService) {}

  generateSignedUrl(jobId: string, partnerId: string, ttlSeconds = 900): string {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const token = this.sign(jobId, partnerId, expires);
    const baseUrl = this.configService.getOrThrow<string>('PUBLIC_API_URL');
    return `${baseUrl}/v1/jobs/${jobId}/report?token=${token}&expires=${expires}`;
  }

  verifyToken(
    jobId: string,
    partnerId: string,
    token: string,
    expires: number,
  ): boolean {
    if (expires < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.sign(jobId, partnerId, expires);
    try {
      return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  private sign(jobId: string, partnerId: string, expires: number): string {
    const secret = this.configService.getOrThrow<string>('DOWNLOAD_SIGNING_SECRET');
    return createHmac('sha256', secret)
      .update(`${jobId}:${partnerId}:${expires}`)
      .digest('hex');
  }
}

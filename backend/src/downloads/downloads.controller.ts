import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentPartner } from '../auth/current-partner.decorator';
import { ApiError } from '../common/api-error';
import { JobsService } from '../jobs/jobs.service';
import { Partner } from '../partners/partner.entity';
import { DownloadsService } from './downloads.service';

@Controller('jobs')
export class DownloadsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly downloadsService: DownloadsService,
  ) {}

  @Get(':id/report')
  async downloadReport(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('expires', ParseIntPipe) expires: number,
    @Res() res: Response,
  ) {
    if (!token || !expires) {
      throw new ApiError('VALIDATION_ERROR', 'Missing token or expires', 400);
    }

    const job = await this.jobsService.findById(id);
    if (!job || !job.reportPath) {
      throw new ApiError('JOB_NOT_FOUND', 'Report not available', 404);
    }

    const valid = this.downloadsService.verifyToken(
      job.id,
      job.partnerId,
      token,
      expires,
    );
    if (!valid) {
      const expired = expires < Math.floor(Date.now() / 1000);
      throw new ApiError(
        expired ? 'LINK_EXPIRED' : 'FORBIDDEN',
        expired ? 'Download link has expired' : 'Invalid download token',
        expired ? 410 : 403,
      );
    }

    const pdf = await this.jobsService.getReportBuffer(job);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${job.id}.pdf"`,
    );
    res.send(pdf);
  }

  @Get(':id/report-url')
  @UseGuards(ApiKeyGuard)
  async getReportUrl(
    @Param('id') id: string,
    @CurrentPartner() partner: Partner,
  ) {
    const job = await this.jobsService.getJobForPartner(id, partner.id);
    return {
      downloadUrl: this.downloadsService.generateSignedUrl(job.id, partner.id),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
  }
}

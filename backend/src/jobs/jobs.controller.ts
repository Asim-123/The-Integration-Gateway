import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentPartner } from '../auth/current-partner.decorator';
import { ApiError } from '../common/api-error';
import { Partner } from '../partners/partner.entity';
import { JobsService } from './jobs.service';

type MultipartRequest = Request & {
  body: { metadata?: string };
  files?: Express.Multer.File[];
};

@Controller('jobs')
@UseGuards(ApiKeyGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: 25 * 1024 * 1024, files: 10 },
    }),
  )
  async createJob(
    @CurrentPartner() partner: Partner,
    @Req() req: MultipartRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const metadataRaw = req.body?.metadata;
    if (!metadataRaw) {
      throw new ApiError('VALIDATION_ERROR', 'metadata field is required', 400, [
        { field: 'metadata', code: 'REQUIRED', message: 'metadata is required' },
      ]);
    }

    const files = (req.files ?? []).filter((f) => f.fieldname === 'files');
    await this.jobsService.validateFileMagicBytes(files);
    return this.jobsService.createJob(
      partner.id,
      metadataRaw,
      files,
      idempotencyKey,
    );
  }

  @Get()
  async listJobs(@CurrentPartner() partner: Partner) {
    return this.jobsService.listJobs(partner.id);
  }

  @Get(':id')
  async getJob(
    @Param('id') id: string,
    @CurrentPartner() partner: Partner,
  ) {
    return this.jobsService.getJobResponse(id, partner.id);
  }

  @Post(':id/webhook/retry')
  async retryWebhook(
    @Param('id') id: string,
    @CurrentPartner() partner: Partner,
  ) {
    return this.jobsService.retryWebhook(id, partner.id);
  }
}

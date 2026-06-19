import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob } from 'bullmq';
import { JobsService, JOB_PROCESSING_QUEUE } from '../jobs/jobs.service';

@Processor(JOB_PROCESSING_QUEUE)
export class JobProcessingProcessor extends WorkerHost {
  constructor(private readonly jobsService: JobsService) {
    super();
  }

  async process(job: BullJob<{ jobId: string }>) {
    await this.jobsService.processJob(job.data.jobId);
  }
}

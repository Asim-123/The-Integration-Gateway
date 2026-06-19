import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Job } from '../jobs/job.entity';

@Injectable()
export class PdfService {
  async generateReport(job: Job, attachmentPreview?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Integration Gateway Report', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Job ID: ${job.id}`);
      doc.text(`Status: ${job.status}`);
      doc.text(`External Ref: ${String(job.metadata.externalRef ?? 'n/a')}`);
      doc.text(`Type: ${String(job.metadata.type ?? 'n/a')}`);
      doc.text(`Created At: ${job.createdAt.toISOString()}`);
      if (job.completedAt) {
        doc.text(`Completed At: ${job.completedAt.toISOString()}`);
      }
      doc.moveDown();
      doc.text('Metadata:');
      doc.fontSize(10).text(JSON.stringify(job.metadata, null, 2));
      doc.moveDown();

      if (attachmentPreview) {
        doc.addPage();
        doc.fontSize(14).text('Attachment Preview');
        doc.moveDown();
        try {
          doc.image(attachmentPreview, { fit: [500, 500], align: 'center' });
        } catch {
          doc.text('Preview unavailable for this attachment type.');
        }
      }

      doc.end();
    });
  }
}

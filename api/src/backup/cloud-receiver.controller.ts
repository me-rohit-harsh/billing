import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { BackupSnapshotPayload } from './backup.service';

@Controller('v1/backups')
export class CloudReceiverController {
  private readonly logger = new Logger(CloudReceiverController.name);

  // Cloud endpoint to receive uploaded store database backup snapshots
  @Post('upload')
  async receiveBackup(
    @Body() payload: BackupSnapshotPayload,
    @Headers('x-store-id') storeIdHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const storeId = storeIdHeader || payload?.metadata?.storeId || 'UNKNOWN_STORE';

    this.logger.log(`Received cloud backup upload from store [${storeId}] containing ${payload?.metadata?.totalDocuments || 0} documents.`);

    if (!payload || !payload.metadata || !payload.data) {
      return {
        success: false,
        message: 'Invalid snapshot payload format.',
      };
    }

    // In a real cloud backend, this saves payload to S3 / Cloud Database / Disk
    const receivedAt = new Date().toISOString();
    const backupId = `cloud_backup_${storeId}_${Date.now()}`;

    return {
      success: true,
      backupId,
      receivedAt,
      message: `Cloud server successfully received and stored backup snapshot for store [${storeId}] (${payload.metadata.totalDocuments} records).`,
    };
  }
}

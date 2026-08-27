import { Controller, Get, Patch, Post, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { BackupService, BackupSnapshotPayload } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  // Get backup settings and current status
  @Get('settings')
  async getSettings() {
    const settings = await this.backupService.getSettings();
    return {
      success: true,
      data: settings,
    };
  }

  // Update backup settings (frequency, daily time, cloud URL, API key, etc.)
  @Patch('settings')
  async updateSettings(@Body() body: any) {
    const updated = await this.backupService.updateSettings(body);
    return {
      success: true,
      data: updated,
      message: 'Backup settings updated successfully.',
    };
  }

  // Trigger manual immediate backup snapshot & cloud sync
  @Post('trigger')
  async triggerBackup() {
    const result = await this.backupService.triggerBackup('MANUAL');
    return {
      success: true,
      data: result,
    };
  }

  // Download local backup JSON file attachment
  @Get('download')
  async downloadBackup(@Res() res: Response) {
    const snapshot = await this.backupService.exportFullDatabase();
    const fileName = `billing_backup_${snapshot.metadata.storeId}_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(HttpStatus.OK).send(JSON.stringify(snapshot, null, 2));
  }

  // Get recent backup execution logs
  @Get('logs')
  async getLogs() {
    const logs = await this.backupService.getLogs();
    return {
      success: true,
      data: logs,
    };
  }

  // Restore database from uploaded JSON snapshot
  @Post('restore')
  async restoreBackup(@Body() body: BackupSnapshotPayload) {
    const result = await this.backupService.restoreFromSnapshot(body);
    return {
      success: true,
      data: result,
    };
  }
}

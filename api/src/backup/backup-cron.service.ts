import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from './backup.service';

@Injectable()
export class BackupCronService {
  private readonly logger = new Logger(BackupCronService.name);

  constructor(private readonly backupService: BackupService) {}

  // Check backup schedule and pending online retries every 15 minutes
  @Cron('0 */15 * * * *')
  async handleScheduledBackupCheck() {
    try {
      const settings = await this.backupService.getSettings();

      if (!settings.enabled) {
        return;
      }

      const now = new Date();

      // 1. Retry pending cloud uploads if previously offline
      if (settings.lastBackupStatus === 'PENDING_ONLINE_RETRY' && settings.autoCloudUpload) {
        this.logger.log('Retrying pending cloud backup upload...');
        const snapshot = await this.backupService.exportFullDatabase();
        const result = await this.backupService.uploadToCloud(snapshot);
        if (result.success) {
          settings.lastBackupStatus = 'SUCCESS';
          settings.lastBackupError = undefined;
          await settings.save();
          this.logger.log('Pending cloud backup successfully uploaded to server!');
        }
        return;
      }

      // 2. Check if a new backup is due
      let isDue = false;

      if (settings.frequency === 'DAILY') {
        const [targetHour, targetMinute] = settings.dailyBackupTime.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const lastBackupDateStr = settings.lastBackupAt ? new Date(settings.lastBackupAt).toDateString() : '';
        const todayStr = now.toDateString();

        // If not backed up today yet and current time >= target time
        if (lastBackupDateStr !== todayStr) {
          if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
            isDue = true;
          }
        }
      } else if (settings.frequency === 'INTERVAL') {
        if (!settings.lastBackupAt) {
          isDue = true;
        } else {
          const hoursSinceLastBackup = (now.getTime() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastBackup >= (settings.intervalHours || 24)) {
            isDue = true;
          }
        }
      }

      if (isDue) {
        this.logger.log('Scheduled backup trigger conditions met. Running backup...');
        await this.backupService.triggerBackup('SCHEDULED');
      }
    } catch (error: any) {
      this.logger.error(`Error during scheduled backup check: ${error.message}`);
    }
  }
}

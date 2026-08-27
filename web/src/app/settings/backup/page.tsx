'use client';

import React, { useState, useEffect } from 'react';
import { api, API_URL } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import {
  Database,
  CloudUpload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Server,
  Key,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  Zap,
} from 'lucide-react';

interface BackupSettingsData {
  enabled: boolean;
  frequency: 'DAILY' | 'INTERVAL' | 'MANUAL';
  intervalHours: number;
  dailyBackupTime: string;
  cloudEndpointUrl: string;
  storeId: string;
  apiKey: string;
  autoCloudUpload: boolean;
  lastBackupAt?: string;
  lastBackupStatus: 'SUCCESS' | 'FAILED' | 'PENDING_ONLINE_RETRY' | 'NEVER_RUN';
  lastBackupError?: string;
  lastBackupDocumentCount: number;
}

interface BackupLogItem {
  _id: string;
  storeId: string;
  backupType: 'MANUAL' | 'SCHEDULED' | 'SHUTDOWN';
  status: 'SUCCESS' | 'FAILED' | 'PENDING_ONLINE_RETRY';
  totalDocuments: number;
  fileSizeBytes: number;
  createdAt: string;
  errorMessage?: string;
  collectionCounts?: Record<string, number>;
}

export default function BackupSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<BackupSettingsData>({
    enabled: true,
    frequency: 'DAILY',
    intervalHours: 24,
    dailyBackupTime: '22:00',
    cloudEndpointUrl: `${API_URL}/v1/backups/upload`,
    storeId: 'STORE_POS_MAIN',
    apiKey: 'secret-store-backup-key-123',
    autoCloudUpload: true,
    lastBackupStatus: 'NEVER_RUN',
    lastBackupDocumentCount: 0,
  });
  const [logs, setLogs] = useState<BackupLogItem[]>([]);

  // Fetch settings & history logs
  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.get('/backup/settings'),
        api.get('/backup/logs'),
      ]);

      if (settingsRes.data?.data) {
        setSettings(settingsRes.data.data);
      }
      if (logsRes.data?.data) {
        setLogs(logsRes.data.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load backup settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch('/backup/settings', settings);
      if (res.data?.success) {
        toast.success('Database backup & cloud sync settings saved!');
        setSettings(res.data.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save backup settings.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Manual Backup & Cloud Upload Now
  const handleTriggerBackupNow = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/backup/trigger');
      if (res.data?.success) {
        toast.success(res.data.data.message || 'Backup snapshot created & cloud sync completed!');
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to trigger backup.');
    } finally {
      setSyncing(false);
    }
  };

  // Download Local JSON Backup File
  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      const response = await api.get('/backup/download', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing_backup_${settings.storeId}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Local database JSON backup file downloaded!');
    } catch (err: any) {
      toast.error('Failed to download backup file.');
    } finally {
      setDownloading(false);
    }
  };

  const frequencyOptions = [
    { _id: 'DAILY', name: 'Once a Day (Daily fixed time)' },
    { _id: 'INTERVAL', name: 'Interval Schedule (Every X Hours)' },
    { _id: 'MANUAL', name: 'Manual Trigger Only' },
  ];

  const getStatusBadge = () => {
    switch (settings.lastBackupStatus) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cloud Backup Synced
          </span>
        );
      case 'PENDING_ONLINE_RETRY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" /> Local Backup Saved (Cloud Upload Pending)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Backup Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs">
            <Database className="w-4 h-4 text-slate-500" /> Never Run
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-600/20 shrink-0">
            <CloudUpload className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Cloud Backup & Database Sync</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              Automate full database snapshot backups to your remote cloud server whenever your device is online.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Download JSON Database File"
          >
            <Download className={`w-4 h-4 text-amber-600 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Exporting...' : 'Download Backup'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerBackupNow}
            disabled={syncing}
            className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Backing Up...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Backup Status</div>
              <div className="mt-1 flex items-center gap-2">{getStatusBadge()}</div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Last Sync Time</span>
            <span className="text-sm font-extrabold text-slate-800">
              {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : 'No backups recorded yet'}
            </span>
          </div>
        </div>

        {settings.lastBackupError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Latest Cloud Backup Alert: {settings.lastBackupError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Documents</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {settings.lastBackupDocumentCount || 0}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Backup Schedule</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 block">
              {settings.frequency === 'DAILY'
                ? `Daily @ ${settings.dailyBackupTime}`
                : settings.frequency === 'INTERVAL'
                ? `Every ${settings.intervalHours} Hours`
                : 'Manual Only'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Store Identifier</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 block truncate" title={settings.storeId}>
              {settings.storeId || 'STORE_POS_MAIN'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Auto Cloud Upload</span>
            <span className={`text-base font-extrabold mt-1 flex items-center gap-1 ${settings.autoCloudUpload ? 'text-emerald-600' : 'text-slate-400'}`}>
              {settings.autoCloudUpload ? (
                <>
                  <Zap className="w-4 h-4 text-emerald-500 inline" /> Enabled
                </>
              ) : (
                'Disabled'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-amber-600" /> Automated Schedule & Cloud Server Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-sm font-extrabold text-slate-900 block">Automated Database Backups</label>
              <p className="text-xs text-slate-500 font-medium">Enable or disable background scheduled exports</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* Auto Cloud Upload Toggle */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-sm font-extrabold text-slate-900 block">Cloud Server Auto-Sync</label>
              <p className="text-xs text-slate-500 font-medium">Upload snapshots to cloud server automatically</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCloudUpload}
              onChange={(e) => setSettings({ ...settings, autoCloudUpload: e.target.checked })}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* Backup Frequency */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Backup Frequency Schedule</label>
            <CustomDropdown
              options={frequencyOptions}
              value={settings.frequency}
              onChange={(val) => setSettings({ ...settings, frequency: val as any })}
            />
          </div>

          {/* Specific Daily Time OR Interval Hours */}
          {settings.frequency === 'DAILY' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Target Daily Backup Time (24h)</label>
              <div className="relative">
                <Clock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="time"
                  required
                  value={settings.dailyBackupTime}
                  onChange={(e) => setSettings({ ...settings, dailyBackupTime: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {settings.frequency === 'INTERVAL' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Interval Hours Between Backups</label>
              <div className="relative">
                <Calendar className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  max={72}
                  required
                  value={settings.intervalHours}
                  onChange={(e) => setSettings({ ...settings, intervalHours: Number(e.target.value) })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Cloud Server Endpoint URL */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Cloud Backup Receiver Endpoint URL</label>
            <div className="relative">
              <Server className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="url"
                required
                value={settings.cloudEndpointUrl}
                onChange={(e) => setSettings({ ...settings, cloudEndpointUrl: e.target.value })}
                placeholder="https://your-cloud-backup-server.com/api/v1/backups/upload"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Store Device ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Store / Device Unique ID</label>
            <div className="relative">
              <Layers className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={settings.storeId}
                onChange={(e) => setSettings({ ...settings, storeId: e.target.value })}
                placeholder="e.g. STORE_POS_01"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Store Secret API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Store Backup Authorization Key</label>
            <div className="relative">
              <Key className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Secret API key for cloud server"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Backup Execution Logs Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" /> Backup Execution History
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
            <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-slate-700">No backup history yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Click "Sync Now" above to run your first database backup.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Trigger Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Documents</th>
                  <th className="px-4 py-3">Payload Size</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {log.backupType}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'SUCCESS' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          SUCCESS
                        </span>
                      ) : log.status === 'PENDING_ONLINE_RETRY' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          PENDING RETRY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{log.totalDocuments}</td>
                    <td className="px-4 py-3">{log.fileSizeBytes ? `${(log.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={log.errorMessage || 'Completed successfully'}>
                      {log.errorMessage || 'Cloud Upload Completed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AudioFileManager — High-level Audio Asset Management
 * 
 * Manages audio blob lifecycles, memory-efficient ObjectURLs,
 * local downloads, and device storage quota checks.
 */

import { databaseService } from './database';

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  isLowStorage: boolean;
}

class AudioFileManager {
  // Cache of generated object URLs to revoke them and avoid memory leaks
  private objectUrlCache: Map<string, string> = new Map();

  /**
   * Persists an audio blob locally for a session
   */
  public async storeRecording(sessionId: string, blob: Blob): Promise<string> {
    await databaseService.saveAudioBlob(sessionId, blob);
    return `local://idb/audio_blobs/${sessionId}`;
  }

  /**
   * Retrieves an audio blob and creates a temporary ObjectURL for playback
   */
  public async getPlaybackUrl(sessionId: string): Promise<string | null> {
    // If we already have an active URL for this session, return it
    if (this.objectUrlCache.has(sessionId)) {
      return this.objectUrlCache.get(sessionId)!;
    }

    const blob = await databaseService.getAudioBlob(sessionId);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.objectUrlCache.set(sessionId, url);
    return url;
  }

  /**
   * Releases an ObjectURL from memory
   */
  public revokePlaybackUrl(sessionId: string): void {
    const existing = this.objectUrlCache.get(sessionId);
    if (existing) {
      URL.revokeObjectURL(existing);
      this.objectUrlCache.delete(sessionId);
    }
  }

  /**
   * Cleans up all cached URLs
   */
  public cleanupAllUrls(): void {
    for (const url of this.objectUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrlCache.clear();
  }

  /**
   * Allows user to export/download audio to their device filesystem
   */
  public async downloadAudio(sessionId: string, filename: string): Promise<boolean> {
    const blob = await databaseService.getAudioBlob(sessionId);
    if (!blob) return false;

    // Determine extension based on mimeType
    let ext = 'webm';
    if (blob.type.includes('mp4') || blob.type.includes('m4a')) {
      ext = 'm4a';
    } else if (blob.type.includes('ogg')) {
      ext = 'ogg';
    }

    const safeFilename = filename
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);

    const fullFilename = `${safeFilename || 'memory_session'}.${ext}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after download prompt
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  /**
   * Checks available storage using navigator.storage.estimate
   */
  public async checkStorageQuota(): Promise<StorageQuotaInfo | null> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percentage = Math.round((usage / quota) * 100);
        // Low storage if less than 50MB available or > 95% full
        const remaining = quota - usage;
        const isLow = remaining < 50 * 1024 * 1024 || percentage > 95;

        return {
          usageBytes: usage,
          quotaBytes: quota,
          usagePercentage: percentage,
          isLowStorage: isLow
        };
      } catch (e) {
        console.warn('Storage estimate error:', e);
      }
    }
    return null;
  }
}

export const audioFileManager = new AudioFileManager();

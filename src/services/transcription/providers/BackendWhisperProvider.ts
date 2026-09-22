/**
 * BackendWhisperProvider — Communicates with the secure backend transcription proxy
 * 
 * Never exposes API keys on the mobile client.
 * Supports segment and word-level timestamps.
 */

import { TranscriptData, TranscriptSegment } from '../../../models/session';
import { BaseTranscriptionProvider } from '../BaseTranscriptionProvider';
import { TranscriptionOptions } from '../types';

export class BackendWhisperProvider extends BaseTranscriptionProvider {
  readonly name = 'OpenAI Whisper (Backend Proxy)';
  readonly isLocal = false;

  private endpointUrl: string;

  constructor(endpointUrl: string = '/api/transcribe') {
    super();
    this.endpointUrl = endpointUrl;
  }

  async transcribeChunk(
    chunkBlob: Blob, 
    _chunkIndex: number, 
    _totalChunks: number, 
    options?: TranscriptionOptions
  ): Promise<TranscriptData> {
    options?.onProgress?.('uploading', 25, 'Sending audio to transcription proxy...');

    const formData = new FormData();
    // Determine extension
    let ext = 'webm';
    if (chunkBlob.type.includes('mp4') || chunkBlob.type.includes('m4a')) ext = 'm4a';
    formData.append('file', chunkBlob, `audio_chunk.${ext}`);
    if (options?.language) formData.append('language', options.language);
    if (options?.prompt) formData.append('prompt', options.prompt);

    options?.onProgress?.('transcribing', 50, 'Transcribing with Whisper model...');

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errMessage = `Transcription failed with HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.message) errMessage = errJson.message;
        if (errJson.code === 'NO_API_KEY') {
          const error: any = new Error('No backend API key configured');
          error.code = 'NO_API_KEY';
          throw error;
        }
      } catch (e: any) {
        if (e.code === 'NO_API_KEY') throw e;
      }
      throw new Error(errMessage);
    }

    const data = await response.json();

    // Map Whisper verbose JSON output (seconds -> milliseconds)
    const rawSegments = data.segments || [];
    const segments: TranscriptSegment[] = rawSegments.map((seg: any, idx: number) => ({
      id: `seg_${idx}_${Date.now()}`,
      startTimeMs: Math.round((seg.start || 0) * 1000),
      endTimeMs: Math.round((seg.end || (seg.start + 1)) * 1000),
      text: (seg.text || '').trim(),
      words: seg.words?.map((w: any) => ({
        word: (w.word || '').trim(),
        startTimeMs: Math.round((w.start || 0) * 1000),
        endTimeMs: Math.round((w.end || 0) * 1000),
        confidence: w.probability ?? 0.95
      }))
    }));

    // If no segments returned, synthesize one from fullText
    if (segments.length === 0 && data.text) {
      segments.push({
        id: `seg_0_${Date.now()}`,
        startTimeMs: 0,
        endTimeMs: 5000,
        text: data.text.trim()
      });
    }

    return {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullText: data.text || segments.map(s => s.text).join(' '),
      language: data.language || 'en',
      segments,
      generatedAt: Date.now(),
      engine: 'whisper-backend',
      status: 'completed'
    };
  }
}

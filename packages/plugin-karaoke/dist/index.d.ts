/**
 * Karaoke Processor - AI-powered vocal removal using Demucs
 *
 * Features:
 * - Streaming mode: Get first 15 seconds quickly for immediate playback
 * - Full track processes in background, seamlessly swaps when ready
 * - Caches processed tracks as base64 (for IPC transfer to renderer)
 */
import { BaseAudioProcessor, type AudioProcessorResult } from '@audiio/sdk';
export interface KaraokeProcessorResult extends AudioProcessorResult {
    audioBase64?: string;
    mimeType?: string;
    isPartial?: boolean;
    duration?: number;
}
export type FullTrackReadyCallback = (trackId: string, result: KaraokeProcessorResult) => void;
export declare class KaraokeProcessor extends BaseAudioProcessor {
    readonly id = "karaoke";
    readonly name = "Karaoke Mode";
    private cache;
    private processing;
    private pollingIntervals;
    private onFullTrackReadyCallbacks;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    /**
     * Register a callback to be notified when a full track becomes ready
     * This replaces the need for renderer-side polling
     */
    onFullTrackReady(callback: FullTrackReadyCallback): () => void;
    /**
     * Notify all listeners that a full track is ready
     */
    private notifyFullTrackReady;
    isAvailable(): Promise<boolean>;
    /**
     * Process track with streaming - returns first segment quickly
     */
    processTrack(trackId: string, audioUrl: string): Promise<KaraokeProcessorResult>;
    private doStreamProcess;
    /**
     * Poll for full track completion in background
     */
    private startPollingForComplete;
    /**
     * Check if full track is ready (not just first segment)
     */
    isFullTrackReady(trackId: string): Promise<boolean>;
    /**
     * Get full track if available (blocks briefly if still processing)
     */
    getFullTrack(trackId: string): Promise<KaraokeProcessorResult | null>;
    hasCached(trackId: string): Promise<boolean>;
    getCached(trackId: string): Promise<KaraokeProcessorResult | null>;
    clearCache(trackId: string): Promise<void>;
    clearAllCache(): Promise<void>;
}
export default KaraokeProcessor;
//# sourceMappingURL=index.d.ts.map
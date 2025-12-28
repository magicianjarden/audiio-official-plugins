/**
 * Essentia Provider - Real-time audio analysis using Essentia.js
 *
 * Uses WebAssembly for in-browser audio feature extraction.
 */
import type { AudioFeatures } from '@audiio/ml-sdk';
type QualityLevel = 'fast' | 'balanced' | 'accurate';
export declare class EssentiaProvider {
    private essentia;
    private isLoading;
    private loadPromise;
    private cache;
    private quality;
    constructor(quality?: QualityLevel);
    /**
     * Initialize the Essentia WASM module
     */
    initialize(): Promise<void>;
    /**
     * Load Essentia.js WASM
     */
    private loadEssentia;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Get audio features for a track (by ID)
     */
    getAudioFeatures(trackId: string): Promise<AudioFeatures | null>;
    /**
     * Analyze audio buffer
     */
    analyzeBuffer(buffer: ArrayBuffer, sampleRate: number): Promise<AudioFeatures | null>;
    /**
     * Extract features from signal
     */
    private extractFeatures;
    /**
     * Normalize key to standard format
     */
    private normalizeKey;
    /**
     * Normalize energy to 0-1 range
     */
    private normalizeEnergy;
    /**
     * Estimate valence from other features
     */
    private estimateValence;
    /**
     * Estimate acousticness
     */
    private estimateAcousticness;
    /**
     * Estimate speechiness from audio
     */
    private estimateSpeechiness;
    /**
     * Resample audio data
     */
    private resample;
    /**
     * Cache features for a track
     */
    cacheFeatures(trackId: string, features: AudioFeatures): void;
}
export {};
//# sourceMappingURL=essentia-provider.d.ts.map
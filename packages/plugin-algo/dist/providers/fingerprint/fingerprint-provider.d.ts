/**
 * Fingerprint Provider - Audio fingerprinting using Chromaprint
 *
 * Generates audio fingerprints for track identification and duplicate detection.
 */
import type { DuplicateResult, TrackMatch, Track, MLCoreEndpoints } from '@audiio/ml-sdk';
export declare class FingerprintProvider {
    private chromaprint;
    private endpoints;
    private fingerprintIndex;
    private cache;
    private isLoading;
    constructor();
    /**
     * Initialize the fingerprint provider
     */
    initialize(endpoints: MLCoreEndpoints): Promise<void>;
    /**
     * Load Chromaprint WASM
     */
    private loadChromaprint;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Generate fingerprint for audio file
     */
    generateFingerprint(filePath: string): Promise<string | null>;
    /**
     * Generate fingerprint from audio buffer
     */
    generateFingerprintFromBuffer(buffer: ArrayBuffer, sampleRate: number): Promise<string | null>;
    /**
     * Index tracks for duplicate detection
     */
    indexTracks(tracks: Track[]): Promise<void>;
    /**
     * Find duplicates in library
     */
    findDuplicates(): Promise<DuplicateResult[]>;
    /**
     * Identify track from fingerprint
     */
    identify(filePath: string): Promise<TrackMatch[]>;
    /**
     * Search library by fingerprint
     */
    private searchByFingerprint;
    /**
     * Generate simple fingerprint (placeholder for real Chromaprint)
     */
    private generateSimpleFingerprint;
    /**
     * Compare two fingerprints
     */
    private compareFingerprints;
    /**
     * Create pseudo-fingerprint from metadata
     */
    private createPseudoFingerprint;
}
//# sourceMappingURL=fingerprint-provider.d.ts.map
/**
 * Sposify Audio Features Database Queries
 * Provides pre-computed Spotify audio features for tracks
 */
import type { AudioFeatures } from '../types';
export declare class AudioFeaturesDatabase {
    private cache;
    private maxCacheSize;
    /**
     * Get audio features by Spotify ID
     */
    getBySpotifyId(spotifyId: string): AudioFeatures | null;
    /**
     * Get audio features by ISRC
     */
    getByIsrc(isrc: string): AudioFeatures | null;
    /**
     * Get audio features for multiple tracks (batch)
     */
    getBatch(spotifyIds: string[]): Map<string, AudioFeatures>;
    /**
     * Get audio features by track metadata (searches then gets features)
     */
    getByMetadata(title: string, artist: string): AudioFeatures | null;
    /**
     * Find tracks with similar audio features
     */
    findSimilar(features: AudioFeatures, limit?: number): Array<{
        spotifyId: string;
        similarity: number;
    }>;
    /**
     * Find tracks by audio feature ranges
     */
    findByFeatureRange(options: {
        minEnergy?: number;
        maxEnergy?: number;
        minDanceability?: number;
        maxDanceability?: number;
        minValence?: number;
        maxValence?: number;
        minTempo?: number;
        maxTempo?: number;
        key?: number;
        mode?: number;
        limit?: number;
    }): string[];
    /**
     * Get average features for a set of tracks (for playlist analysis)
     */
    getAverageFeatures(spotifyIds: string[]): Partial<AudioFeatures> | null;
    /**
     * Convert database record to AudioFeatures type
     */
    private convertDbToAudioFeatures;
    /**
     * Add to cache with LRU eviction
     */
    private addToCache;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Set max cache size
     */
    setMaxCacheSize(size: number): void;
}
export declare function getAudioFeaturesDatabase(): AudioFeaturesDatabase;
//# sourceMappingURL=audio-features-db.d.ts.map
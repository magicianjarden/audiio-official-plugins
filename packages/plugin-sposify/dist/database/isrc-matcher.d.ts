/**
 * Sposify ISRC Matcher
 * Matches local tracks to Spotify database using ISRC, metadata, and fuzzy matching
 */
import type { TrackMatch } from '../types';
export interface LocalTrackInfo {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    isrc?: string;
}
export interface MatchResult {
    matches: TrackMatch[];
    unmatched: string[];
    stats: {
        total: number;
        matchedByIsrc: number;
        matchedByExact: number;
        matchedByNormalized: number;
        matchedByFuzzy: number;
        unmatched: number;
        averageConfidence: number;
    };
}
export declare class IsrcMatcher {
    private minConfidence;
    private enableFuzzyMatching;
    private durationToleranceMs;
    /**
     * Match a batch of local tracks to Spotify database
     */
    matchTracks(tracks: LocalTrackInfo[], onProgress?: (progress: number) => void): MatchResult;
    /**
     * Match a single track
     */
    matchSingleTrack(track: LocalTrackInfo): TrackMatch | null;
    /**
     * Fuzzy match using Fuse.js
     */
    private fuzzyMatch;
    /**
     * Create a match result
     */
    private createMatch;
    /**
     * Normalize string for comparison
     */
    private normalizeString;
    /**
     * Calculate string similarity (Dice coefficient)
     */
    private calculateSimilarity;
    /**
     * Get bigrams from string
     */
    private getBigrams;
    setMinConfidence(value: number): void;
    setFuzzyMatchingEnabled(enabled: boolean): void;
    setDurationTolerance(ms: number): void;
}
export declare function getIsrcMatcher(): IsrcMatcher;
//# sourceMappingURL=isrc-matcher.d.ts.map
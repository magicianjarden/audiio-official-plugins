/**
 * Radio Generator - Generates infinite radio playlists from seeds
 */
import type { Track, RadioSeed, ScoringContext, MLCoreEndpoints } from '@audiio/ml-sdk';
import type { HybridScorer } from '../scoring/hybrid-scorer';
export declare class RadioGenerator {
    private endpoints;
    private scorer;
    private sessionTracks;
    private seedDrift;
    constructor(endpoints: MLCoreEndpoints, scorer: HybridScorer);
    /**
     * Generate radio tracks from a seed
     */
    generate(seed: RadioSeed, count: number, context: ScoringContext): Promise<Track[]>;
    /**
     * Reset radio session for a seed
     */
    resetSession(seed: RadioSeed): void;
    /**
     * Get candidates based on seed type
     */
    private getCandidatesForSeed;
    /**
     * Select tracks with variety (not all top scores)
     */
    private selectWithVariety;
    /**
     * Shuffle with bias toward keeping high scores early
     */
    private shuffleWithBias;
    /**
     * Get session key for a seed
     */
    private getSessionKey;
}
//# sourceMappingURL=radio-generator.d.ts.map
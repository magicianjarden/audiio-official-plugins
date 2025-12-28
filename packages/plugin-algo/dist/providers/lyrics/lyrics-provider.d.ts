/**
 * Lyrics Provider - Lyrics sentiment and theme analysis
 *
 * Uses a small transformer model for sentiment and keyword extraction.
 */
import type { LyricsFeatures, MLCoreEndpoints } from '@audiio/ml-sdk';
export declare class LyricsProvider {
    private model;
    private endpoints;
    private cache;
    private vocabulary;
    constructor();
    /**
     * Initialize the lyrics model
     */
    initialize(endpoints: MLCoreEndpoints): Promise<void>;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Get lyrics features for a track
     */
    getLyricsFeatures(trackId: string): Promise<LyricsFeatures | null>;
    /**
     * Analyze lyrics text
     */
    analyzeLyrics(lyrics: string): Promise<LyricsFeatures>;
    /**
     * Create sentiment model
     */
    private createModel;
    /**
     * Predict sentiment using model
     */
    private predictSentiment;
    /**
     * Fallback sentiment analysis using word lists
     */
    private fallbackSentiment;
    /**
     * Detect themes in lyrics
     */
    private detectThemes;
    /**
     * Calculate emotional intensity
     */
    private calculateIntensity;
    /**
     * Detect language (simplified)
     */
    private detectLanguage;
    /**
     * Tokenize lyrics
     */
    private tokenize;
    /**
     * Build basic vocabulary
     */
    private buildVocabulary;
    /**
     * Cache features for a track
     */
    cacheFeatures(trackId: string, features: LyricsFeatures): void;
}
//# sourceMappingURL=lyrics-provider.d.ts.map
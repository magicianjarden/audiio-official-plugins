/**
 * Hybrid Scorer - Combines rule-based and neural network scoring
 */
import type { Track, AggregatedFeatures, TrackScore, ScoringContext, ScoreExplanation, UserEvent, MLCoreEndpoints } from '@audiio/ml-sdk';
import type { NeuralScorer } from './neural-scorer';
export declare class HybridScorer {
    private endpoints;
    private neuralScorer;
    private settings;
    private userPreferences?;
    private temporalPatterns?;
    private preferencesExpiry;
    private recentScores;
    constructor(endpoints: MLCoreEndpoints, neuralScorer: NeuralScorer, settings: Record<string, unknown>);
    /**
     * Score a single track
     */
    score(track: Track, features: AggregatedFeatures, context: ScoringContext): Promise<TrackScore>;
    /**
     * Score multiple tracks efficiently
     */
    scoreBatch(tracks: Track[], context: ScoringContext): Promise<TrackScore[]>;
    /**
     * Handle user events for real-time updates
     */
    handleEvent(event: UserEvent): void;
    /**
     * Get explanation for a track's score
     */
    explain(trackId: string): Promise<ScoreExplanation>;
    /**
     * Calculate all score components
     */
    private calculateComponents;
    /**
     * Get scoring weights based on settings
     */
    private getWeights;
    /**
     * Calculate mood match
     */
    private calculateMoodMatch;
    /**
     * Calculate activity match
     */
    private calculateActivityMatch;
    /**
     * Calculate confidence in the score
     */
    private calculateConfidence;
    /**
     * Ensure we have fresh user preferences
     */
    private ensurePreferences;
    /**
     * Get label for a component
     */
    private getComponentLabel;
    /**
     * Get reason for a component value
     */
    private getComponentReason;
    /**
     * Generate summary for explanation
     */
    private generateSummary;
    /**
     * Calculate session average score
     */
    private calculateSessionAverage;
}
//# sourceMappingURL=hybrid-scorer.d.ts.map
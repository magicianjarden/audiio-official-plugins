/**
 * Audiio Algorithm - Official recommendation algorithm
 */
import { BaseAlgorithm, type AlgorithmManifest, type Track, type ScoredTrack, type AggregatedFeatures, type TrackScore, type ScoringContext, type TrainingDataset, type TrainingResult, type TrainingStatus, type UserEvent, type FeatureProvider, type RadioSeed, type ScoreExplanation } from '@audiio/ml-sdk';
export declare class AudiioAlgorithm extends BaseAlgorithm {
    manifest: AlgorithmManifest;
    private hybridScorer;
    private neuralScorer;
    private trainer;
    private radioGenerator;
    private essentiaProvider?;
    private emotionProvider?;
    private lyricsProvider?;
    private fingerprintProvider?;
    private embeddingProvider?;
    featureProviders: FeatureProvider[];
    protected onInitialize(): Promise<void>;
    protected onDispose(): Promise<void>;
    private initializeProviders;
    private registerProviders;
    scoreTrack(track: Track, features: AggregatedFeatures, context: ScoringContext): Promise<TrackScore>;
    scoreBatch(tracks: Track[], context: ScoringContext): Promise<TrackScore[]>;
    rankCandidates(candidates: Track[], context: ScoringContext): Promise<ScoredTrack[]>;
    train(data: TrainingDataset): Promise<TrainingResult>;
    getTrainingStatus(): TrainingStatus;
    needsTraining(): Promise<boolean>;
    private trainAsync;
    generateRadio(seed: RadioSeed, count: number, context: ScoringContext): Promise<Track[]>;
    findSimilar(trackId: string, limit: number): Promise<ScoredTrack[]>;
    onUserEvent(event: UserEvent): Promise<void>;
    private ensureFingerprintProvider;
    indexLibrary(tracks: Track[]): Promise<void>;
    findDuplicates(): Promise<import('@audiio/ml-sdk').DuplicateResult[]>;
    identifyTrack(audioPath: string): Promise<import('@audiio/ml-sdk').TrackMatch[]>;
    explainScore(trackId: string): Promise<ScoreExplanation>;
}
//# sourceMappingURL=audiio-algorithm.d.ts.map
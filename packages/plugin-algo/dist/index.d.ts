/**
 * Audiio Algo - Official ML/AI Algorithm Plugin
 *
 * This plugin provides:
 * - Audio feature extraction (Essentia.js)
 * - Emotion/mood detection
 * - Lyrics sentiment analysis
 * - Audio fingerprinting
 * - Track similarity embeddings
 * - Neural network scoring
 * - Radio/playlist generation
 *
 * Third-party developers can create alternative algorithms
 * by implementing the AlgorithmPlugin interface from @audiio/ml-sdk.
 */
export { AudiioAlgorithm, RadioGenerator } from './algorithm';
export { AUDIIO_ALGO_MANIFEST } from './manifest';
export { HybridScorer, NeuralScorer } from './scoring';
export { Trainer } from './training';
export { EssentiaProvider, EmotionProvider, LyricsProvider, FingerprintProvider, EmbeddingProvider, } from './providers';
export { createUIPluginAdapter, audiioAlgoUIPlugin } from './adapter';
export type { AlgorithmPlugin, AlgorithmManifest, AlgorithmCapabilities, AlgorithmRequirements, AlgorithmSettingDefinition, MLCoreEndpoints, Track, TrackScore, ScoringContext, AudioFeatures, EmotionFeatures, LyricsFeatures, AggregatedFeatures, TrainingDataset, TrainingResult, } from '@audiio/ml-sdk';
/**
 * Audiio Algorithm Plugin - BaseAddon compatible wrapper
 *
 * This class wraps the algorithm functionality in a format compatible
 * with the Audiio plugin loader. The actual ML functionality is handled
 * by the MLService in the main process, but this registers the plugin
 * in the addon registry for UI visibility.
 */
export declare class AudiioAlgoPlugin {
    readonly id = "algo";
    readonly name = "Audiio Algorithm";
    get manifest(): {
        id: string;
        name: string;
        version: any;
        roles: "audio-processor"[];
        description: any;
        author: any;
        settings: any;
    };
    initialize(): Promise<void>;
    dispose(): Promise<void>;
}
export default AudiioAlgoPlugin;
//# sourceMappingURL=index.d.ts.map
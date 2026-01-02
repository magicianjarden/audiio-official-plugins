/**
 * Audiio Algo Extension Plugin
 *
 * This plugin provides EXTENSION capabilities beyond the core algorithm:
 * - Audio fingerprinting (Chromaprint-based duplicate detection)
 * - Pipeline hooks for Discover "See All" integration
 *
 * Core algorithm functionality (scoring, training, providers) is now in @audiio/ml-core.
 * This plugin supplements the core with advanced features.
 */

// Extension Feature Providers
export { FingerprintProvider } from './providers';

// Pipeline hooks (for Discover "See All" integration)
export {
  emotionTransformer,
  lyricsTransformer,
  audioFeaturesTransformer,
  sessionFlowTransformer,
  registerAlgoPipelineHooks,
} from './pipeline';

// Manifest for extension plugin
export const AUDIIO_ALGO_EXTENSION_MANIFEST = {
  id: 'audiio-algo-extension',
  name: 'Audiio Algorithm Extension',
  version: '2.0.0',
  description: 'Advanced features for Audiio ML: fingerprinting and pipeline hooks',
  author: 'Audiio Team',
};

// Re-export types for convenience
export type {
  AudioFeatures,
  EmotionFeatures,
  LyricsFeatures,
  AggregatedFeatures,
} from '@audiio/ml-sdk';

/**
 * Audiio Algorithm Extension Plugin
 *
 * Registers extension providers with the core ML engine.
 * The fingerprint provider supplements the core providers.
 */
export class AudiioAlgoExtension {
  readonly id = 'algo-extension';
  readonly name = 'Audiio Algorithm Extension';
  private fingerprintProvider: InstanceType<typeof FingerprintProvider> | null = null;

  get manifest() {
    return {
      id: this.id,
      name: this.name,
      version: AUDIIO_ALGO_EXTENSION_MANIFEST.version,
      roles: ['audio-processor' as const],
      description: AUDIIO_ALGO_EXTENSION_MANIFEST.description,
      author: AUDIIO_ALGO_EXTENSION_MANIFEST.author,
    };
  }

  /**
   * Initialize the extension and register providers with ml-core
   */
  async initialize(engine?: any): Promise<void> {
    console.log('[AudiioAlgoExtension] Initializing extension plugin...');

    try {
      // Initialize fingerprint provider
      const { FingerprintProvider } = await import('./providers');
      this.fingerprintProvider = new FingerprintProvider();
      await this.fingerprintProvider.initialize();

      // Register with ml-core engine if provided
      if (engine?.registerFeatureProvider) {
        engine.registerFeatureProvider({
          id: 'extension-fingerprint',
          priority: 60, // Plugin priority (> 50)
          mode: 'supplement',
          capabilities: {
            audioAnalysis: false,
            emotionDetection: false,
            lyricsAnalysis: false,
            embeddings: false,
            similarity: false,
            fingerprinting: true,
            canAnalyzeUrl: false,
            canAnalyzeFile: true,
            canAnalyzeBuffer: true,
            supportsRealtime: false,
            requiresWasm: false,
          },
          getFingerprint: async (trackId: string) =>
            this.fingerprintProvider?.getFingerprint(trackId) ?? null,
        }, 'supplement');
        console.log('[AudiioAlgoExtension] Registered fingerprint provider with ml-core');
      }

      console.log('[AudiioAlgoExtension] Extension initialized');
    } catch (error) {
      console.error('[AudiioAlgoExtension] Failed to initialize:', error);
    }
  }

  async dispose(): Promise<void> {
    console.log('[AudiioAlgoExtension] Disposing extension...');

    if (this.fingerprintProvider) {
      await this.fingerprintProvider.dispose();
      this.fingerprintProvider = null;
    }

    console.log('[AudiioAlgoExtension] Extension disposed');
  }
}

// Default export for plugin loader compatibility
export default AudiioAlgoExtension;

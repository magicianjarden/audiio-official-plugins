/**
 * Pipeline Registration
 *
 * Registers all algorithm plugin transformers with the Discover pipeline.
 */

import type { PluginPipelineAPI } from '@audiio/sdk';
import { emotionTransformer, setEmotionProvider } from './emotion-transformer';
import { lyricsTransformer, setLyricsProvider } from './lyrics-transformer';
import {
  audioFeaturesTransformer,
  setEssentiaProvider as setAudioEssentiaProvider,
} from './audio-features-transformer';
import {
  sessionFlowTransformer,
  setEssentiaProvider as setFlowEssentiaProvider,
  setEmotionProvider as setFlowEmotionProvider,
} from './session-flow-transformer';
import { EmotionProvider } from '../providers/emotion/emotion-provider';
import { LyricsProvider } from '../providers/lyrics/lyrics-provider';
import { EssentiaProvider } from '../providers/essentia/essentia-provider';

/**
 * Register all algorithm plugin pipeline hooks
 *
 * @param pipeline - The pipeline API from the app
 * @param providers - Provider instances to inject
 */
export function registerAlgoPipelineHooks(
  pipeline: PluginPipelineAPI,
  providers: {
    emotion?: EmotionProvider;
    lyrics?: LyricsProvider;
    essentia?: EssentiaProvider;
  }
): void {
  console.log('[AlgoPipeline] Registering pipeline hooks...');

  // Inject provider instances
  if (providers.emotion) {
    setEmotionProvider(providers.emotion);
    setFlowEmotionProvider(providers.emotion);
    console.log('[AlgoPipeline] Emotion provider injected');
  }

  if (providers.lyrics) {
    setLyricsProvider(providers.lyrics);
    console.log('[AlgoPipeline] Lyrics provider injected');
  }

  if (providers.essentia) {
    setAudioEssentiaProvider(providers.essentia);
    setFlowEssentiaProvider(providers.essentia);
    console.log('[AlgoPipeline] Essentia provider injected');
  }

  // Register transformers
  const transformers = [
    emotionTransformer,
    lyricsTransformer,
    audioFeaturesTransformer,
    sessionFlowTransformer,
  ];

  for (const transformer of transformers) {
    try {
      pipeline.registerTransformer(transformer);
      console.log(`[AlgoPipeline] Registered transformer: ${transformer.name}`);
    } catch (error) {
      console.error(
        `[AlgoPipeline] Failed to register transformer ${transformer.name}:`,
        error
      );
    }
  }

  console.log(
    `[AlgoPipeline] Registered ${transformers.length} transformers`
  );
}

/**
 * Unregister all algorithm plugin pipeline hooks
 */
export function unregisterAlgoPipelineHooks(pipeline: PluginPipelineAPI): void {
  pipeline.unregisterPlugin('algo');
  console.log('[AlgoPipeline] Unregistered all pipeline hooks');
}

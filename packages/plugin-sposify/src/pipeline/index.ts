/**
 * Pipeline Hooks for Sposify Plugin
 *
 * Provides audio features filtering and similar track discovery
 * to the Discover "See All" pipeline.
 */

export {
  spotifyFeaturesTransformer,
  setAudioFeaturesDb as setTransformerDb,
} from './spotify-features-transformer';
export {
  similarFeaturesProvider,
  setAudioFeaturesDb as setProviderDb,
} from './similar-features-provider';
export {
  registerSposifyPipelineHooks,
  unregisterSposifyPipelineHooks,
} from './register';

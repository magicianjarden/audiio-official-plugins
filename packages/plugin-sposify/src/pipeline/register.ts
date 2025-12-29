/**
 * Pipeline Registration
 *
 * Registers Sposify audio features transformer and provider with the Discover pipeline.
 */

import type { PluginPipelineAPI } from '@audiio/sdk';
import {
  spotifyFeaturesTransformer,
  setAudioFeaturesDb as setTransformerDb,
} from './spotify-features-transformer';
import {
  similarFeaturesProvider,
  setAudioFeaturesDb as setProviderDb,
} from './similar-features-provider';
import { AudioFeaturesDatabase } from '../database/audio-features-db';

/**
 * Register Sposify pipeline hooks
 *
 * @param pipeline - The pipeline API from the app
 * @param db - AudioFeaturesDatabase instance for audio feature lookups
 */
export function registerSposifyPipelineHooks(
  pipeline: PluginPipelineAPI,
  db?: AudioFeaturesDatabase
): void {
  console.log('[SposifyPipeline] Registering pipeline hooks...');

  // Inject database instances
  if (db) {
    setTransformerDb(db);
    setProviderDb(db);
    console.log('[SposifyPipeline] AudioFeaturesDatabase injected');
  }

  // Register transformer
  try {
    pipeline.registerTransformer(spotifyFeaturesTransformer);
    console.log('[SposifyPipeline] Registered spotify-features transformer');
  } catch (error) {
    console.error(
      '[SposifyPipeline] Failed to register spotify-features transformer:',
      error
    );
  }

  // Register provider
  try {
    pipeline.registerProvider(similarFeaturesProvider);
    console.log('[SposifyPipeline] Registered similar-features provider');
  } catch (error) {
    console.error(
      '[SposifyPipeline] Failed to register similar-features provider:',
      error
    );
  }

  console.log('[SposifyPipeline] Pipeline hooks registered');
}

/**
 * Unregister Sposify pipeline hooks
 */
export function unregisterSposifyPipelineHooks(pipeline: PluginPipelineAPI): void {
  pipeline.unregisterPlugin('sposify');
  console.log('[SposifyPipeline] Unregistered all pipeline hooks');
}

/**
 * Pipeline Registration
 *
 * Registers the Deezer charts data provider with the Discover pipeline.
 */
import type { PluginPipelineAPI } from '@audiio/sdk';
import { DeezerMetadataProvider } from '../index';
/**
 * Register Deezer pipeline hooks
 *
 * @param pipeline - The pipeline API from the app
 * @param provider - Optional Deezer provider instance for chart data
 */
export declare function registerDeezerPipelineHooks(pipeline: PluginPipelineAPI, provider?: DeezerMetadataProvider): void;
/**
 * Unregister Deezer pipeline hooks
 */
export declare function unregisterDeezerPipelineHooks(pipeline: PluginPipelineAPI): void;
//# sourceMappingURL=register.d.ts.map
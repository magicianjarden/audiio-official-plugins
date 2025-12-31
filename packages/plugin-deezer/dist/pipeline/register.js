"use strict";
/**
 * Pipeline Registration
 *
 * Registers the Deezer charts data provider with the Discover pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeezerPipelineHooks = registerDeezerPipelineHooks;
exports.unregisterDeezerPipelineHooks = unregisterDeezerPipelineHooks;
const charts_provider_1 = require("./charts-provider");
/**
 * Register Deezer pipeline hooks
 *
 * @param pipeline - The pipeline API from the app
 * @param provider - Optional Deezer provider instance for chart data
 */
function registerDeezerPipelineHooks(pipeline, provider) {
    console.log('[DeezerPipeline] Registering pipeline hooks...');
    // Inject provider instance if available
    if (provider) {
        (0, charts_provider_1.setDeezerProvider)(provider);
        console.log('[DeezerPipeline] Provider instance injected');
    }
    // Register the charts data provider
    try {
        pipeline.registerProvider(charts_provider_1.deezerChartsProvider);
        console.log('[DeezerPipeline] Registered charts data provider');
    }
    catch (error) {
        console.error('[DeezerPipeline] Failed to register charts provider:', error);
    }
}
/**
 * Unregister Deezer pipeline hooks
 */
function unregisterDeezerPipelineHooks(pipeline) {
    pipeline.unregisterPlugin('deezer');
    console.log('[DeezerPipeline] Unregistered all pipeline hooks');
}
//# sourceMappingURL=register.js.map
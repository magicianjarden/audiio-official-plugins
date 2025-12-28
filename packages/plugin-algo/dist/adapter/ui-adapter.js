"use strict";
/**
 * UI Adapter - Bridges Audiio Algo plugin to the UI integration layer
 *
 * This is a simplified adapter that provides a UI-compatible interface.
 * Full integration with ml-core will be completed in the UI package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.audiioAlgoUIPlugin = void 0;
exports.createUIPluginAdapter = createUIPluginAdapter;
const manifest_1 = require("../manifest");
/**
 * Create a UI-compatible plugin wrapper for AudiioAlgorithm
 */
function createUIPluginAdapter() {
    let initialized = false;
    return {
        manifest: {
            id: manifest_1.AUDIIO_ALGO_MANIFEST.id,
            name: manifest_1.AUDIIO_ALGO_MANIFEST.name,
            version: manifest_1.AUDIIO_ALGO_MANIFEST.version,
            capabilities: {
                audioFeatures: true,
                emotionDetection: true,
                lyricsAnalysis: true,
                fingerprinting: true,
                embeddings: true,
                neuralScoring: true,
            },
        },
        async initialize() {
            if (initialized)
                return;
            initialized = true;
            console.log('[UIAdapter] Audiio Algorithm adapter ready');
        },
        async dispose() {
            initialized = false;
        },
        async getAudioFeatures(_trackId) {
            // Audio features will be provided through the full ml-core integration
            return null;
        },
        async findSimilar(_trackId, _limit) {
            // Similarity search will be provided through the full ml-core integration
            return [];
        },
        async scoreTrack(_track, _context) {
            // Scoring will be provided through the full ml-core integration
            return { score: 0.5, confidence: 0 };
        },
    };
}
/**
 * Export singleton factory
 */
exports.audiioAlgoUIPlugin = createUIPluginAdapter();
exports.default = exports.audiioAlgoUIPlugin;
//# sourceMappingURL=ui-adapter.js.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.audiioAlgoUIPlugin = exports.createUIPluginAdapter = exports.EmbeddingProvider = exports.FingerprintProvider = exports.LyricsProvider = exports.EmotionProvider = exports.EssentiaProvider = exports.Trainer = exports.NeuralScorer = exports.HybridScorer = exports.AUDIIO_ALGO_MANIFEST = exports.RadioGenerator = exports.AudiioAlgorithm = void 0;
exports.createAudiioAlgorithm = createAudiioAlgorithm;
// Main algorithm
var algorithm_1 = require("./algorithm");
Object.defineProperty(exports, "AudiioAlgorithm", { enumerable: true, get: function () { return algorithm_1.AudiioAlgorithm; } });
Object.defineProperty(exports, "RadioGenerator", { enumerable: true, get: function () { return algorithm_1.RadioGenerator; } });
var manifest_1 = require("./manifest");
Object.defineProperty(exports, "AUDIIO_ALGO_MANIFEST", { enumerable: true, get: function () { return manifest_1.AUDIIO_ALGO_MANIFEST; } });
// Scoring components
var scoring_1 = require("./scoring");
Object.defineProperty(exports, "HybridScorer", { enumerable: true, get: function () { return scoring_1.HybridScorer; } });
Object.defineProperty(exports, "NeuralScorer", { enumerable: true, get: function () { return scoring_1.NeuralScorer; } });
// Training
var training_1 = require("./training");
Object.defineProperty(exports, "Trainer", { enumerable: true, get: function () { return training_1.Trainer; } });
// Feature providers
var providers_1 = require("./providers");
Object.defineProperty(exports, "EssentiaProvider", { enumerable: true, get: function () { return providers_1.EssentiaProvider; } });
Object.defineProperty(exports, "EmotionProvider", { enumerable: true, get: function () { return providers_1.EmotionProvider; } });
Object.defineProperty(exports, "LyricsProvider", { enumerable: true, get: function () { return providers_1.LyricsProvider; } });
Object.defineProperty(exports, "FingerprintProvider", { enumerable: true, get: function () { return providers_1.FingerprintProvider; } });
Object.defineProperty(exports, "EmbeddingProvider", { enumerable: true, get: function () { return providers_1.EmbeddingProvider; } });
// UI Adapter (for integration with existing UI code)
var adapter_1 = require("./adapter");
Object.defineProperty(exports, "createUIPluginAdapter", { enumerable: true, get: function () { return adapter_1.createUIPluginAdapter; } });
Object.defineProperty(exports, "audiioAlgoUIPlugin", { enumerable: true, get: function () { return adapter_1.audiioAlgoUIPlugin; } });
// Import for use in createAudiioAlgorithm
const algorithm_2 = require("./algorithm");
/**
 * Create and return the Audiio Algorithm instance
 */
function createAudiioAlgorithm() {
    return new algorithm_2.AudiioAlgorithm();
}
/**
 * Plugin metadata for auto-discovery
 */
exports.plugin = {
    name: 'audiio-algo',
    version: '1.0.0',
    description: 'Official Audiio ML/AI Algorithm Plugin',
    create: createAudiioAlgorithm,
};
exports.default = exports.plugin;
//# sourceMappingURL=index.js.map
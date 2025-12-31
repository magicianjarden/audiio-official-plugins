"use strict";
/**
 * Pipeline Hooks for Deezer Plugin
 *
 * Provides chart/trending data to the Discover "See All" pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unregisterDeezerPipelineHooks = exports.registerDeezerPipelineHooks = exports.setDeezerProvider = exports.deezerChartsProvider = void 0;
var charts_provider_1 = require("./charts-provider");
Object.defineProperty(exports, "deezerChartsProvider", { enumerable: true, get: function () { return charts_provider_1.deezerChartsProvider; } });
Object.defineProperty(exports, "setDeezerProvider", { enumerable: true, get: function () { return charts_provider_1.setDeezerProvider; } });
var register_1 = require("./register");
Object.defineProperty(exports, "registerDeezerPipelineHooks", { enumerable: true, get: function () { return register_1.registerDeezerPipelineHooks; } });
Object.defineProperty(exports, "unregisterDeezerPipelineHooks", { enumerable: true, get: function () { return register_1.unregisterDeezerPipelineHooks; } });
//# sourceMappingURL=index.js.map
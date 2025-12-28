"use strict";
/**
 * Sposify - Spotify Data Integration Plugin for Audiio
 *
 * Features:
 * - Import Spotify data export (streaming history, liked tracks, playlists)
 * - Audio features enrichment (tempo, key, danceability, energy, valence)
 * - ISRC metadata matching for local files
 * - Playlist discovery from 6.6M curated playlists
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.plugin = exports.sposifyTool = exports.SposifyTool = exports.setMainWindow = exports.unregisterSposifyHandlers = exports.registerSposifyHandlers = exports.getSpotifyImportService = exports.SpotifyImportService = exports.getImportMapper = exports.ImportMapper = exports.getPlaylistParser = exports.PlaylistParser = exports.getLibraryParser = exports.LibraryParser = exports.getHistoryParser = exports.HistoryParser = exports.getIsrcMatcher = exports.IsrcMatcher = exports.getAudioFeaturesDatabase = exports.AudioFeaturesDatabase = exports.getPlaylistDatabase = exports.PlaylistDatabase = exports.closeSposifyDatabase = exports.getSposifyDatabase = exports.SposifyDatabase = exports.SPOSIFY_MANIFEST = void 0;
// Types
__exportStar(require("./types"), exports);
// Manifest
var manifest_1 = require("./manifest");
Object.defineProperty(exports, "SPOSIFY_MANIFEST", { enumerable: true, get: function () { return manifest_1.SPOSIFY_MANIFEST; } });
// Database
var database_1 = require("./database");
Object.defineProperty(exports, "SposifyDatabase", { enumerable: true, get: function () { return database_1.SposifyDatabase; } });
Object.defineProperty(exports, "getSposifyDatabase", { enumerable: true, get: function () { return database_1.getSposifyDatabase; } });
Object.defineProperty(exports, "closeSposifyDatabase", { enumerable: true, get: function () { return database_1.closeSposifyDatabase; } });
Object.defineProperty(exports, "PlaylistDatabase", { enumerable: true, get: function () { return database_1.PlaylistDatabase; } });
Object.defineProperty(exports, "getPlaylistDatabase", { enumerable: true, get: function () { return database_1.getPlaylistDatabase; } });
Object.defineProperty(exports, "AudioFeaturesDatabase", { enumerable: true, get: function () { return database_1.AudioFeaturesDatabase; } });
Object.defineProperty(exports, "getAudioFeaturesDatabase", { enumerable: true, get: function () { return database_1.getAudioFeaturesDatabase; } });
Object.defineProperty(exports, "IsrcMatcher", { enumerable: true, get: function () { return database_1.IsrcMatcher; } });
Object.defineProperty(exports, "getIsrcMatcher", { enumerable: true, get: function () { return database_1.getIsrcMatcher; } });
// Import
var import_1 = require("./import");
Object.defineProperty(exports, "HistoryParser", { enumerable: true, get: function () { return import_1.HistoryParser; } });
Object.defineProperty(exports, "getHistoryParser", { enumerable: true, get: function () { return import_1.getHistoryParser; } });
Object.defineProperty(exports, "LibraryParser", { enumerable: true, get: function () { return import_1.LibraryParser; } });
Object.defineProperty(exports, "getLibraryParser", { enumerable: true, get: function () { return import_1.getLibraryParser; } });
Object.defineProperty(exports, "PlaylistParser", { enumerable: true, get: function () { return import_1.PlaylistParser; } });
Object.defineProperty(exports, "getPlaylistParser", { enumerable: true, get: function () { return import_1.getPlaylistParser; } });
Object.defineProperty(exports, "ImportMapper", { enumerable: true, get: function () { return import_1.ImportMapper; } });
Object.defineProperty(exports, "getImportMapper", { enumerable: true, get: function () { return import_1.getImportMapper; } });
Object.defineProperty(exports, "SpotifyImportService", { enumerable: true, get: function () { return import_1.SpotifyImportService; } });
Object.defineProperty(exports, "getSpotifyImportService", { enumerable: true, get: function () { return import_1.getSpotifyImportService; } });
// IPC (Main Process Only) - Legacy exports for backwards compatibility
var ipc_1 = require("./ipc");
Object.defineProperty(exports, "registerSposifyHandlers", { enumerable: true, get: function () { return ipc_1.registerSposifyHandlers; } });
Object.defineProperty(exports, "unregisterSposifyHandlers", { enumerable: true, get: function () { return ipc_1.unregisterSposifyHandlers; } });
Object.defineProperty(exports, "setMainWindow", { enumerable: true, get: function () { return ipc_1.setMainWindow; } });
// Tool class (new pattern for plugin system)
var sposify_tool_1 = require("./sposify-tool");
Object.defineProperty(exports, "SposifyTool", { enumerable: true, get: function () { return sposify_tool_1.SposifyTool; } });
Object.defineProperty(exports, "sposifyTool", { enumerable: true, get: function () { return sposify_tool_1.sposifyTool; } });
/**
 * Plugin metadata for registration
 */
exports.plugin = {
    id: 'sposify',
    name: 'Sposify',
    version: '1.0.0',
    description: 'Import Spotify data, enrich with audio features, match by ISRC, discover playlists',
    author: 'Audiio',
    toolType: 'data-transfer',
};
// Default export is the Tool class for the plugin loader to instantiate
var sposify_tool_2 = require("./sposify-tool");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return sposify_tool_2.SposifyTool; } });
//# sourceMappingURL=index.js.map
"use strict";
/**
 * Sposify Database Module - Re-exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseExists = exports.setupDatabase = exports.getIsrcMatcher = exports.IsrcMatcher = exports.getAudioFeaturesDatabase = exports.AudioFeaturesDatabase = exports.getPlaylistDatabase = exports.PlaylistDatabase = exports.closeSposifyDatabase = exports.getSposifyDatabase = exports.SposifyDatabase = void 0;
var sposify_db_1 = require("./sposify-db");
Object.defineProperty(exports, "SposifyDatabase", { enumerable: true, get: function () { return sposify_db_1.SposifyDatabase; } });
Object.defineProperty(exports, "getSposifyDatabase", { enumerable: true, get: function () { return sposify_db_1.getSposifyDatabase; } });
Object.defineProperty(exports, "closeSposifyDatabase", { enumerable: true, get: function () { return sposify_db_1.closeSposifyDatabase; } });
var playlist_db_1 = require("./playlist-db");
Object.defineProperty(exports, "PlaylistDatabase", { enumerable: true, get: function () { return playlist_db_1.PlaylistDatabase; } });
Object.defineProperty(exports, "getPlaylistDatabase", { enumerable: true, get: function () { return playlist_db_1.getPlaylistDatabase; } });
var audio_features_db_1 = require("./audio-features-db");
Object.defineProperty(exports, "AudioFeaturesDatabase", { enumerable: true, get: function () { return audio_features_db_1.AudioFeaturesDatabase; } });
Object.defineProperty(exports, "getAudioFeaturesDatabase", { enumerable: true, get: function () { return audio_features_db_1.getAudioFeaturesDatabase; } });
var isrc_matcher_1 = require("./isrc-matcher");
Object.defineProperty(exports, "IsrcMatcher", { enumerable: true, get: function () { return isrc_matcher_1.IsrcMatcher; } });
Object.defineProperty(exports, "getIsrcMatcher", { enumerable: true, get: function () { return isrc_matcher_1.getIsrcMatcher; } });
var database_setup_1 = require("./database-setup");
Object.defineProperty(exports, "setupDatabase", { enumerable: true, get: function () { return database_setup_1.setupDatabase; } });
Object.defineProperty(exports, "checkDatabaseExists", { enumerable: true, get: function () { return database_setup_1.checkDatabaseExists; } });
//# sourceMappingURL=index.js.map
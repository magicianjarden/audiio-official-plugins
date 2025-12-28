/**
 * Sposify - Spotify Data Integration Plugin for Audiio
 *
 * Features:
 * - Import Spotify data export (streaming history, liked tracks, playlists)
 * - Audio features enrichment (tempo, key, danceability, energy, valence)
 * - ISRC metadata matching for local files
 * - Playlist discovery from 6.6M curated playlists
 */
export * from './types';
export { SPOSIFY_MANIFEST, type SposifyManifest } from './manifest';
export { SposifyDatabase, getSposifyDatabase, closeSposifyDatabase, PlaylistDatabase, getPlaylistDatabase, AudioFeaturesDatabase, getAudioFeaturesDatabase, IsrcMatcher, getIsrcMatcher, type LocalTrackInfo, type MatchResult, } from './database';
export { HistoryParser, getHistoryParser, type HistoryParseResult, LibraryParser, getLibraryParser, type LibraryParseResult, PlaylistParser, getPlaylistParser, type PlaylistParseResult, ImportMapper, getImportMapper, SpotifyImportService, getSpotifyImportService, type ImportPhase, type ImportProgress, type ImportCallbacks, type UnifiedTrack, type ListenEvent, type Playlist, } from './import';
export { registerSposifyHandlers, unregisterSposifyHandlers, setMainWindow, } from './ipc';
export { SposifyTool, sposifyTool } from './sposify-tool';
/**
 * Plugin metadata for registration
 */
export declare const plugin: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    toolType: string;
};
export { SposifyTool as default } from './sposify-tool';
//# sourceMappingURL=index.d.ts.map
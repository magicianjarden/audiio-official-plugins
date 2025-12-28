/**
 * Sposify Import Service
 * Orchestrates the complete Spotify data import process
 */
import type { ParsedSpotifyData, ImportOptions, ImportResult, MatchedTrack, MatchedHistoryEntry, MatchedPlaylist } from '../types';
import { type UnifiedTrack, type ListenEvent, type Playlist } from './import-mapper';
export type ImportPhase = 'idle' | 'parsing' | 'matching' | 'importing' | 'complete' | 'error';
export interface ImportProgress {
    phase: ImportPhase;
    progress: number;
    currentItem?: string;
    stats?: {
        parsed?: number;
        matched?: number;
        imported?: number;
    };
}
export interface ImportCallbacks {
    onProgress?: (progress: ImportProgress) => void;
    onTrackImported?: (track: UnifiedTrack) => void;
    onListenRecorded?: (event: ListenEvent) => void;
    onPlaylistCreated?: (playlist: Playlist) => void;
}
export declare class SpotifyImportService {
    private historyParser;
    private libraryParser;
    private playlistParser;
    private importMapper;
    /**
     * Parse Spotify export files
     */
    parseExportFiles(filePaths: string[]): ParsedSpotifyData;
    /**
     * Parse Spotify export directory
     */
    parseExportDirectory(dirPath: string): ParsedSpotifyData;
    /**
     * Match parsed data against Sposify database
     */
    matchParsedData(data: ParsedSpotifyData, callbacks?: ImportCallbacks): {
        matchedLikedTracks: MatchedTrack[];
        unmatchedLikedTracks: typeof data.likedTracks;
        matchedHistory: MatchedHistoryEntry[];
        matchedPlaylists: MatchedPlaylist[];
        matchStats: {
            likedTracksMatchRate: number;
            historyMatchRate: number;
            averagePlaylistMatchRate: number;
        };
    };
    /**
     * Execute the import with matched data
     */
    executeImport(options: ImportOptions, matchedData: {
        matchedLikedTracks: MatchedTrack[];
        matchedHistory: MatchedHistoryEntry[];
        matchedPlaylists: MatchedPlaylist[];
    }, callbacks?: ImportCallbacks): Promise<ImportResult>;
    /**
     * Full import flow: parse -> match -> import
     */
    fullImport(filePaths: string[], options: ImportOptions, callbacks?: ImportCallbacks): Promise<ImportResult>;
}
export declare function getSpotifyImportService(): SpotifyImportService;
//# sourceMappingURL=spotify-import-service.d.ts.map
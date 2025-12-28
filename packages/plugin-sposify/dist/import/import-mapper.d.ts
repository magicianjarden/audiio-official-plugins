/**
 * Sposify Import Mapper
 * Maps parsed Spotify data to Audiio data structures
 */
import type { NormalizedTrack, NormalizedHistoryEntry, NormalizedPlaylist, MatchedTrack, MatchedHistoryEntry, MatchedPlaylist } from '../types';
export interface UnifiedTrack {
    id: string;
    title: string;
    artists: Array<{
        id: string;
        name: string;
    }>;
    album?: {
        id: string;
        name: string;
        artwork?: string;
    };
    duration: number;
    genres?: string[];
    releaseDate?: string;
    explicit?: boolean;
    _meta: {
        metadataProvider: string;
        matchConfidence: number;
        externalIds: {
            spotify?: string;
            isrc?: string;
        };
    };
}
export interface ListenEvent {
    trackId: string;
    timestamp: number;
    duration: number;
    totalDuration: number;
    completed: boolean;
    skipped: boolean;
}
export interface Playlist {
    id: string;
    name: string;
    description?: string;
    tracks: UnifiedTrack[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class ImportMapper {
    /**
     * Match and convert normalized tracks to UnifiedTrack format
     */
    matchAndConvertTracks(tracks: NormalizedTrack[], onProgress?: (progress: number) => void): {
        matched: MatchedTrack[];
        unmatched: NormalizedTrack[];
    };
    /**
     * Convert matched track to UnifiedTrack format
     */
    toUnifiedTrack(matched: MatchedTrack): UnifiedTrack;
    /**
     * Match and convert history entries
     */
    matchAndConvertHistory(entries: NormalizedHistoryEntry[], onProgress?: (progress: number) => void): MatchedHistoryEntry[];
    /**
     * Convert matched history entry to ListenEvent
     */
    toListenEvent(entry: MatchedHistoryEntry, trackId: string, totalDuration: number): ListenEvent;
    /**
     * Match and convert playlist
     */
    matchAndConvertPlaylist(playlist: NormalizedPlaylist, prefix?: string, onProgress?: (progress: number) => void): MatchedPlaylist;
    /**
     * Convert matched playlist to Playlist format
     */
    toPlaylist(matched: MatchedPlaylist): Playlist;
    /**
     * Generate unique ID
     */
    private generateId;
}
export declare function getImportMapper(): ImportMapper;
//# sourceMappingURL=import-mapper.d.ts.map
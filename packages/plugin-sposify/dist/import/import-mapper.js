"use strict";
/**
 * Sposify Import Mapper
 * Maps parsed Spotify data to Audiio data structures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportMapper = void 0;
exports.getImportMapper = getImportMapper;
const isrc_matcher_1 = require("../database/isrc-matcher");
const audio_features_db_1 = require("../database/audio-features-db");
const sposify_db_1 = require("../database/sposify-db");
class ImportMapper {
    /**
     * Match and convert normalized tracks to UnifiedTrack format
     */
    matchAndConvertTracks(tracks, onProgress) {
        const matcher = (0, isrc_matcher_1.getIsrcMatcher)();
        const audioFeaturesDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        const localTracks = tracks.map((t, i) => ({
            id: String(i),
            title: t.trackName,
            artist: t.artistName,
            album: t.albumName,
            isrc: undefined, // Could be extracted from Spotify URI
        }));
        const result = matcher.matchTracks(localTracks, onProgress);
        // Enrich with audio features
        const matchedTracks = [];
        for (const match of result.matches) {
            const features = audioFeaturesDb.getBySpotifyId(match.spotifyId);
            const originalIndex = parseInt(match.localId, 10);
            matchedTracks.push({
                original: tracks[originalIndex],
                spotifyId: match.spotifyId,
                isrc: match.track.isrc || undefined,
                confidence: match.confidence,
                matchedBy: match.matchedBy,
                audioFeatures: features || undefined,
            });
        }
        const unmatchedTracks = result.unmatched.map(id => tracks[parseInt(id, 10)]);
        return { matched: matchedTracks, unmatched: unmatchedTracks };
    }
    /**
     * Convert matched track to UnifiedTrack format
     */
    toUnifiedTrack(matched) {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        const dbTrack = db.getTrackById(matched.spotifyId);
        return {
            id: this.generateId(),
            title: matched.original.trackName,
            artists: [{
                    id: dbTrack?.artist_id || this.generateId(),
                    name: matched.original.artistName,
                }],
            album: matched.original.albumName ? {
                id: dbTrack?.album_id || this.generateId(),
                name: matched.original.albumName,
            } : undefined,
            duration: dbTrack?.duration_ms ? Math.round(dbTrack.duration_ms / 1000) : 180,
            genres: dbTrack?.genres ? JSON.parse(dbTrack.genres) : undefined,
            explicit: dbTrack?.explicit === 1,
            _meta: {
                metadataProvider: 'sposify',
                matchConfidence: matched.confidence,
                externalIds: {
                    spotify: matched.spotifyId,
                    isrc: matched.isrc,
                },
            },
        };
    }
    /**
     * Match and convert history entries
     */
    matchAndConvertHistory(entries, onProgress) {
        const matcher = (0, isrc_matcher_1.getIsrcMatcher)();
        // Deduplicate entries by track for matching
        const uniqueTracks = new Map();
        for (const entry of entries) {
            const key = `${entry.artistName}:::${entry.trackName}`;
            if (!uniqueTracks.has(key)) {
                uniqueTracks.set(key, entry);
            }
        }
        // Match unique tracks
        const localTracks = Array.from(uniqueTracks.entries()).map(([key, entry]) => ({
            id: key,
            title: entry.trackName,
            artist: entry.artistName,
            album: entry.albumName,
        }));
        const matchResult = matcher.matchTracks(localTracks, onProgress);
        const matchMap = new Map(matchResult.matches.map(m => [m.localId, m]));
        // Apply matches to all entries
        return entries.map(entry => {
            const key = `${entry.artistName}:::${entry.trackName}`;
            const match = matchMap.get(key);
            return {
                ...entry,
                matchedSpotifyId: match?.spotifyId,
                matchConfidence: match?.confidence,
            };
        });
    }
    /**
     * Convert matched history entry to ListenEvent
     */
    toListenEvent(entry, trackId, totalDuration) {
        return {
            trackId,
            timestamp: new Date(entry.endTime).getTime(),
            duration: entry.msPlayed,
            totalDuration,
            completed: entry.msPlayed > 30000 && entry.msPlayed >= totalDuration * 0.8,
            skipped: entry.skipped || entry.msPlayed < 30000,
        };
    }
    /**
     * Match and convert playlist
     */
    matchAndConvertPlaylist(playlist, prefix = '', onProgress) {
        const { matched, unmatched } = this.matchAndConvertTracks(playlist.tracks, onProgress);
        const matchRate = playlist.tracks.length > 0
            ? matched.length / playlist.tracks.length
            : 0;
        return {
            ...playlist,
            name: prefix + playlist.name,
            matchedTracks: matched,
            unmatchedTracks: unmatched,
            matchRate,
        };
    }
    /**
     * Convert matched playlist to Playlist format
     */
    toPlaylist(matched) {
        return {
            id: this.generateId(),
            name: matched.name,
            description: matched.description,
            tracks: matched.matchedTracks.map(t => this.toUnifiedTrack(t)),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `sposify_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
exports.ImportMapper = ImportMapper;
// Singleton
let instance = null;
function getImportMapper() {
    if (!instance) {
        instance = new ImportMapper();
    }
    return instance;
}
//# sourceMappingURL=import-mapper.js.map
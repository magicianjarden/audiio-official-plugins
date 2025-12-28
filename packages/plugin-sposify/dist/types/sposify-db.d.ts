/**
 * Types for Sposify SQLite Database
 */
export interface DbTrack {
    spotify_id: string;
    title: string;
    artist_name: string;
    artist_id: string | null;
    album_name: string | null;
    album_id: string | null;
    duration_ms: number | null;
    isrc: string | null;
    upc: string | null;
    popularity: number | null;
    release_date: string | null;
    explicit: number;
    preview_url: string | null;
    genres: string | null;
}
export interface DbAudioFeatures {
    spotify_id: string;
    tempo: number | null;
    key: number | null;
    mode: number | null;
    time_signature: number | null;
    danceability: number | null;
    energy: number | null;
    loudness: number | null;
    speechiness: number | null;
    acousticness: number | null;
    instrumentalness: number | null;
    liveness: number | null;
    valence: number | null;
}
export interface DbArtist {
    spotify_id: string;
    name: string;
    genres: string | null;
    popularity: number | null;
    followers: number | null;
}
export interface DbAlbum {
    spotify_id: string;
    name: string;
    artist_id: string | null;
    release_date: string | null;
    total_tracks: number | null;
    upc: string | null;
    label: string | null;
}
export interface DbPlaylistIndex {
    playlist_id: string;
    name: string;
    description: string | null;
    owner: string | null;
    followers: number | null;
    track_count: number | null;
    is_public: number;
    snapshot_id: string | null;
}
export interface DbPlaylistTrack {
    playlist_id: string;
    spotify_id: string;
    position: number;
    added_at: string | null;
}
export interface DbImportedHistory {
    id: number;
    track_name: string;
    artist_name: string;
    end_time: string;
    ms_played: number;
    matched_spotify_id: string | null;
    matched_confidence: number | null;
    imported_at: number;
}
export interface DbImportedLikedTrack {
    spotify_id: string;
    added_at: string | null;
    imported_at: number;
}
export interface DbImportedPlaylist {
    playlist_id: string;
    name: string;
    track_spotify_ids: string;
    imported_at: number;
}
export interface PlaylistPreview {
    playlistId: string;
    name: string;
    description: string | null;
    owner: string | null;
    followers: number;
    trackCount: number;
}
export interface PlaylistDetail extends PlaylistPreview {
    tracks: TrackInfo[];
}
export interface TrackInfo {
    spotifyId: string;
    title: string;
    artistName: string;
    albumName: string | null;
    durationMs: number | null;
    isrc: string | null;
    explicit: boolean;
    popularity: number | null;
}
export interface DatabaseStatus {
    ready: boolean;
    path: string | null;
    trackCount: number;
    artistCount: number;
    albumCount: number;
    playlistCount: number;
    hasAudioFeatures: boolean;
    audioFeaturesCount: number;
    databaseSizeBytes: number;
    version: string;
    lastUpdated: number | null;
}
export interface PlaylistSearchOptions {
    limit?: number;
    offset?: number;
    minFollowers?: number;
    maxFollowers?: number;
    minTracks?: number;
    maxTracks?: number;
}
export interface TrackSearchOptions {
    limit?: number;
    offset?: number;
    minPopularity?: number;
}
export interface TrackMatch {
    localId: string;
    spotifyId: string;
    confidence: number;
    matchedBy: 'isrc' | 'exact' | 'normalized' | 'fuzzy';
    track: TrackInfo;
}
//# sourceMappingURL=sposify-db.d.ts.map
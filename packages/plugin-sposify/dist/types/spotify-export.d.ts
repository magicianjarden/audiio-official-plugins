/**
 * Types for Spotify Data Export (Privacy Request)
 * These match the JSON structure from Spotify's data export
 */
export interface SpotifyStreamingHistoryEntry {
    endTime: string;
    artistName: string;
    trackName: string;
    msPlayed: number;
}
export interface SpotifyExtendedStreamingHistory {
    ts: string;
    username: string;
    platform: string;
    ms_played: number;
    conn_country: string;
    ip_addr_decrypted: string;
    user_agent_decrypted: string;
    master_metadata_track_name: string;
    master_metadata_album_artist_name: string;
    master_metadata_album_album_name: string;
    spotify_track_uri: string;
    episode_name: string | null;
    episode_show_name: string | null;
    spotify_episode_uri: string | null;
    reason_start: string;
    reason_end: string;
    shuffle: boolean;
    skipped: boolean | null;
    offline: boolean;
    offline_timestamp: number;
    incognito_mode: boolean;
}
export interface SpotifyLibrary {
    tracks: SpotifyLibraryTrack[];
    albums: SpotifyLibraryAlbum[];
    shows: SpotifyLibraryShow[];
    episodes: SpotifyLibraryEpisode[];
    artists: SpotifyLibraryArtist[];
    bannedTracks: SpotifyLibraryTrack[];
    bannedArtists: SpotifyLibraryArtist[];
}
export interface SpotifyLibraryTrack {
    artist: string;
    album: string;
    track: string;
    uri: string;
}
export interface SpotifyLibraryAlbum {
    artist: string;
    album: string;
    uri: string;
}
export interface SpotifyLibraryShow {
    name: string;
    publisher: string;
    uri: string;
}
export interface SpotifyLibraryEpisode {
    name: string;
    show: string;
    uri: string;
}
export interface SpotifyLibraryArtist {
    name: string;
    uri: string;
}
export interface SpotifyPlaylistExport {
    name: string;
    lastModifiedDate: string;
    items: SpotifyPlaylistItem[];
    description?: string;
    numberOfFollowers?: number;
}
export interface SpotifyPlaylistItem {
    track: {
        trackName: string;
        artistName: string;
        albumName: string;
        trackUri: string;
    };
    episode: null;
    localTrack: null;
    addedDate: string;
}
export interface ParsedSpotifyData {
    history: NormalizedHistoryEntry[];
    likedTracks: NormalizedTrack[];
    playlists: NormalizedPlaylist[];
    bannedTracks: NormalizedTrack[];
    parseErrors: ParseError[];
    stats: {
        totalHistoryEntries: number;
        uniqueTracksPlayed: number;
        totalPlaytimeMs: number;
        dateRange: {
            start: string;
            end: string;
        } | null;
        likedTracksCount: number;
        playlistsCount: number;
    };
}
export interface NormalizedHistoryEntry {
    trackName: string;
    artistName: string;
    albumName?: string;
    endTime: string;
    msPlayed: number;
    spotifyUri?: string;
    skipped?: boolean;
}
export interface NormalizedTrack {
    trackName: string;
    artistName: string;
    albumName?: string;
    spotifyUri?: string;
    spotifyId?: string;
}
export interface NormalizedPlaylist {
    name: string;
    description?: string;
    tracks: NormalizedTrack[];
    lastModified?: string;
}
export interface ParseError {
    file: string;
    error: string;
    line?: number;
}
export interface MatchedTrack {
    original: NormalizedTrack;
    spotifyId: string;
    isrc?: string;
    confidence: number;
    matchedBy: 'isrc' | 'exact' | 'normalized' | 'fuzzy';
    audioFeatures?: AudioFeatures;
}
export interface MatchedHistoryEntry extends NormalizedHistoryEntry {
    matchedSpotifyId?: string;
    matchConfidence?: number;
}
export interface MatchedPlaylist extends NormalizedPlaylist {
    matchedTracks: MatchedTrack[];
    unmatchedTracks: NormalizedTrack[];
    matchRate: number;
}
export interface AudioFeatures {
    spotifyId: string;
    tempo: number;
    key: number;
    mode: number;
    timeSignature: number;
    danceability: number;
    energy: number;
    loudness: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
}
export interface ImportOptions {
    importHistory: boolean;
    importLikedTracks: boolean;
    importPlaylists: boolean;
    importBannedAsDisliked: boolean;
    mergeHistory: boolean;
    playlistPrefix: string;
    minConfidence: number;
}
export interface ImportResult {
    historyImported: number;
    tracksLiked: number;
    tracksDisliked: number;
    playlistsCreated: number;
    errors: ImportError[];
    duration: number;
}
export interface ImportError {
    type: 'history' | 'track' | 'playlist';
    item: string;
    error: string;
}
//# sourceMappingURL=spotify-export.d.ts.map
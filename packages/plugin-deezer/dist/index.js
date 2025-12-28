"use strict";
/**
 * Deezer Metadata Provider
 * Provides track, artist, and album metadata from Deezer's public API
 * Supports configurable metadata fetching to allow complementary providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeezerMetadataProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const DEEZER_API = 'https://api.deezer.com';
/** Default settings - fetch everything */
const DEFAULT_SETTINGS = {
    fetchArtwork: true,
    fetchArtistInfo: true,
    fetchAlbumInfo: true,
    fetchExternalIds: true
};
class DeezerMetadataProvider extends sdk_1.BaseMetadataProvider {
    id = 'deezer';
    name = 'Deezer';
    priority = 80;
    settings = { ...DEFAULT_SETTINGS };
    /**
     * Update provider settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    async search(query, options) {
        const limit = options?.limit ?? 25;
        const offset = options?.offset ?? 0;
        const url = `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${offset}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Deezer API error: ${response.status}`);
        }
        const data = await response.json();
        return {
            tracks: data.data.map(track => this.mapTrack(track)),
            artists: [],
            albums: []
        };
    }
    async getTrack(id) {
        try {
            const response = await fetch(`${DEEZER_API}/track/${id}`);
            if (!response.ok)
                return null;
            const data = await response.json();
            return this.mapTrack(data);
        }
        catch {
            return null;
        }
    }
    async getArtist(id) {
        if (!this.settings.fetchArtistInfo) {
            return null;
        }
        try {
            // Fetch artist info, top tracks, albums, and related artists in parallel
            const [artistRes, topTracksRes, albumsRes, relatedRes] = await Promise.all([
                fetch(`${DEEZER_API}/artist/${id}`),
                fetch(`${DEEZER_API}/artist/${id}/top?limit=10`),
                fetch(`${DEEZER_API}/artist/${id}/albums?limit=50`),
                fetch(`${DEEZER_API}/artist/${id}/related?limit=10`)
            ]);
            if (!artistRes.ok)
                return null;
            const artistData = await artistRes.json();
            const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { data: [] };
            const albumsData = albumsRes.ok ? await albumsRes.json() : { data: [] };
            const relatedData = relatedRes.ok ? await relatedRes.json() : { data: [] };
            // Map top tracks
            const topTracks = topTracksData.data.map(track => this.mapTrack(track));
            // Categorize albums (Deezer includes record_type in album response)
            const albums = [];
            const singles = [];
            const eps = [];
            const compilations = [];
            const appearsOn = [];
            for (const album of albumsData.data) {
                const mappedAlbum = this.mapAlbumBasic(album);
                // Check if this is an album where the artist appears but isn't the main artist
                const isAppearance = album.artist && album.artist.id !== parseInt(id);
                if (isAppearance) {
                    appearsOn.push(mappedAlbum);
                }
                else {
                    switch (album.record_type) {
                        case 'single':
                            singles.push(mappedAlbum);
                            break;
                        case 'ep':
                            eps.push(mappedAlbum);
                            break;
                        case 'compile':
                            compilations.push(mappedAlbum);
                            break;
                        default:
                            albums.push(mappedAlbum);
                    }
                }
            }
            // Map similar artists
            const similarArtists = relatedData.data.map(a => this.mapArtist(a));
            const result = {
                id: String(artistData.id),
                name: artistData.name,
                followers: artistData.nb_fan,
                topTracks,
                albums,
                singles,
                eps,
                compilations,
                appearsOn,
                similarArtists
            };
            // Add artwork if enabled (with fallback to base picture)
            const hasPicture = artistData.picture_medium || artistData.picture_small || artistData.picture_big || artistData.picture_xl || artistData.picture;
            if (this.settings.fetchArtwork && hasPicture) {
                const fallback = artistData.picture;
                result.artwork = {
                    small: artistData.picture_small || fallback,
                    medium: artistData.picture_medium || fallback,
                    large: artistData.picture_big || fallback,
                    original: artistData.picture_xl || fallback
                };
            }
            return result;
        }
        catch (error) {
            console.error('Deezer getArtist error:', error);
            return null;
        }
    }
    async getAlbum(id) {
        if (!this.settings.fetchAlbumInfo) {
            return null;
        }
        try {
            const response = await fetch(`${DEEZER_API}/album/${id}`);
            if (!response.ok)
                return null;
            const data = await response.json();
            return this.mapAlbumWithTracks(data);
        }
        catch {
            return null;
        }
    }
    mapTrack(track) {
        const result = {
            id: String(track.id),
            title: track.title,
            artists: this.settings.fetchArtistInfo
                ? [this.mapArtist(track.artist)]
                : [{ id: String(track.artist.id), name: track.artist.name }],
            duration: track.duration,
            explicit: track.explicit_lyrics,
            _provider: 'deezer'
        };
        // Conditionally add album info
        if (this.settings.fetchAlbumInfo && track.album) {
            result.album = this.mapAlbumBasic(track.album);
        }
        // Conditionally add artwork
        if (this.settings.fetchArtwork && track.album) {
            result.artwork = this.mapAlbumArtwork(track.album);
        }
        // Conditionally add external IDs
        if (this.settings.fetchExternalIds) {
            result.externalIds = {
                deezer: String(track.id),
                isrc: track.isrc
            };
        }
        return result;
    }
    mapArtist(artist) {
        const result = {
            id: String(artist.id),
            name: artist.name
        };
        // Conditionally add artist artwork with fallback to base picture
        const hasPicture = artist.picture_medium || artist.picture_small || artist.picture_big || artist.picture_xl || artist.picture;
        if (this.settings.fetchArtwork && hasPicture) {
            const fallback = artist.picture;
            result.artwork = {
                small: artist.picture_small || fallback,
                medium: artist.picture_medium || fallback,
                large: artist.picture_big || fallback,
                original: artist.picture_xl || fallback
            };
        }
        return result;
    }
    mapAlbumBasic(album) {
        const result = {
            id: String(album.id),
            title: album.title
        };
        // Conditionally add artwork
        if (this.settings.fetchArtwork) {
            result.artwork = this.mapAlbumArtwork(album);
        }
        // Always include basic album metadata if fetchAlbumInfo is enabled
        if (this.settings.fetchAlbumInfo) {
            result.releaseDate = album.release_date;
            result.trackCount = album.nb_tracks;
            if (album.artist && this.settings.fetchArtistInfo) {
                result.artists = [this.mapArtist(album.artist)];
            }
        }
        return result;
    }
    mapAlbumWithTracks(album) {
        return {
            ...this.mapAlbumBasic(album),
            tracks: album.tracks?.data.map(track => this.mapTrack(track)) ?? []
        };
    }
    mapAlbumArtwork(album) {
        // Fall back to base cover if size variants aren't available
        const fallback = album.cover;
        return {
            small: album.cover_small || fallback,
            medium: album.cover_medium || fallback,
            large: album.cover_big || fallback,
            original: album.cover_xl || fallback
        };
    }
    /**
     * Get chart/trending data from Deezer
     * Uses Deezer's /chart endpoint for real trending content
     */
    async getCharts(limit = 20) {
        try {
            // Fetch charts data in parallel
            const [tracksRes, artistsRes, albumsRes] = await Promise.all([
                fetch(`${DEEZER_API}/chart/0/tracks?limit=${limit}`),
                fetch(`${DEEZER_API}/chart/0/artists?limit=${limit}`),
                fetch(`${DEEZER_API}/chart/0/albums?limit=${limit}`)
            ]);
            const tracksData = tracksRes.ok
                ? await tracksRes.json()
                : { data: [] };
            const artistsData = artistsRes.ok
                ? await artistsRes.json()
                : { data: [] };
            const albumsData = albumsRes.ok
                ? await albumsRes.json()
                : { data: [] };
            return {
                tracks: tracksData.data.map(track => this.mapTrack(track)),
                artists: artistsData.data.map(artist => this.mapArtist(artist)),
                albums: albumsData.data.map(album => this.mapAlbumBasic(album))
            };
        }
        catch (error) {
            console.error('[Deezer] Failed to fetch charts:', error);
            return { tracks: [], artists: [], albums: [] };
        }
    }
}
exports.DeezerMetadataProvider = DeezerMetadataProvider;
// Default export for addon loading
exports.default = DeezerMetadataProvider;
//# sourceMappingURL=index.js.map
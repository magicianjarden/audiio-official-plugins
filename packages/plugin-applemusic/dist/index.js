"use strict";
/**
 * Apple Music Animated Artwork Provider
 * Fetches animated album artwork from Apple Music to enhance track display
 * Based on: https://github.com/Skidudeaa/Apple-Music-Animated-Artwork-Fetcher
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleMusicArtworkProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const ITUNES_API = 'https://itunes.apple.com';
const APPLE_MUSIC_API = 'https://amp-api.music.apple.com/v1/catalog';
// Token sources to try fetching from (Apple's JS bundles)
const TOKEN_SOURCES = [
    'https://music.apple.com/us/browse',
    'https://music.apple.com/us/album/1',
];
/** Default settings */
const DEFAULT_SETTINGS = {
    artworkType: 'animated',
    aspectRatio: 'tall',
    loopCount: 2,
    includeAudio: false
};
class AppleMusicArtworkProvider {
    id = 'applemusic-artwork';
    name = 'Apple Music Artwork';
    priority = 90; // Higher priority for artwork
    settings = { ...DEFAULT_SETTINGS };
    cachedToken = null;
    tokenRefreshAttempted = false;
    get manifest() {
        return {
            id: this.id,
            name: this.name,
            version: '1.0.0',
            description: 'Fetches animated album artwork from Apple Music',
            roles: [] // This is an artwork enhancement utility, not a full metadata provider
        };
    }
    async initialize() {
        // No initialization needed
    }
    async dispose() {
        // No cleanup needed
    }
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
    /**
     * Search for an album and get its artwork
     */
    async getArtwork(query) {
        try {
            // Search iTunes for the album to get the ID
            const album = await this.searchAlbum(query);
            if (!album) {
                return null;
            }
            // Fetch animated artwork from Apple Music API
            const animatedArtwork = await this.fetchAnimatedArtwork(String(album.collectionId));
            if (animatedArtwork) {
                return animatedArtwork;
            }
            // Fall back to static artwork if no animated available
            return {
                staticUrl: this.resizeArtworkUrl(album.artworkUrl100, 3000),
                hasAnimated: false,
                aspectRatio: this.settings.aspectRatio,
                albumId: String(album.collectionId)
            };
        }
        catch (error) {
            console.error('Apple Music artwork fetch error:', error);
            return null;
        }
    }
    /**
     * Get artwork by Apple Music album ID directly
     */
    async getArtworkById(albumId) {
        try {
            // Try to get animated artwork first
            const animatedArtwork = await this.fetchAnimatedArtwork(albumId);
            if (animatedArtwork) {
                return animatedArtwork;
            }
            // Fall back to iTunes lookup for static artwork
            const url = `${ITUNES_API}/lookup?id=${albumId}&entity=album`;
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const album = data.results[0];
            if (data.resultCount === 0 || !album) {
                return null;
            }
            return {
                staticUrl: this.resizeArtworkUrl(album.artworkUrl100, 3000),
                hasAnimated: false,
                aspectRatio: this.settings.aspectRatio,
                albumId
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Get a valid token, refreshing if necessary
     */
    async getToken() {
        if (this.cachedToken) {
            return this.cachedToken;
        }
        // Try to fetch a fresh token
        const token = await this.refreshToken();
        if (token) {
            this.cachedToken = token;
        }
        return token;
    }
    /**
     * Fetch animated artwork from Apple Music API
     */
    async fetchAnimatedArtwork(albumId, country = 'us') {
        try {
            const token = await this.getToken();
            if (!token) {
                console.warn('No Apple Music token available, cannot fetch animated artwork');
                return null;
            }
            const url = `${APPLE_MUSIC_API}/${country}/albums/${albumId}?extend=editorialVideo`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'https://music.apple.com'
                }
            });
            if (!response.ok) {
                // Token might be expired, try to refresh once
                if (response.status === 401 && !this.tokenRefreshAttempted) {
                    this.tokenRefreshAttempted = true;
                    this.cachedToken = null;
                    const newToken = await this.refreshToken();
                    if (newToken) {
                        this.cachedToken = newToken;
                        this.tokenRefreshAttempted = false;
                        return this.fetchAnimatedArtwork(albumId, country);
                    }
                }
                return null;
            }
            // Reset the refresh flag on success
            this.tokenRefreshAttempted = false;
            const data = await response.json();
            const albumData = data.data[0];
            if (!albumData) {
                return null;
            }
            const attributes = albumData.attributes;
            const editorialVideo = attributes.editorialVideo;
            // Get static artwork URL
            const staticUrl = attributes.artwork?.url
                ? attributes.artwork.url.replace('{w}x{h}', '3000x3000')
                : '';
            // Check for animated artwork
            if (!editorialVideo) {
                return {
                    staticUrl,
                    hasAnimated: false,
                    aspectRatio: this.settings.aspectRatio,
                    albumId
                };
            }
            // Extract video URL based on preferred aspect ratio
            const videoAsset = this.extractVideoAsset(editorialVideo);
            return {
                videoUrl: videoAsset?.video,
                staticUrl,
                hasAnimated: !!videoAsset?.video,
                aspectRatio: this.settings.aspectRatio,
                albumId,
                previewFrameUrl: videoAsset?.previewFrame?.url
            };
        }
        catch (error) {
            console.error('Failed to fetch animated artwork:', error);
            return null;
        }
    }
    /**
     * Extract video asset based on settings
     */
    extractVideoAsset(editorialVideo) {
        if (this.settings.aspectRatio === 'tall') {
            return editorialVideo.motionDetailTall;
        }
        // For square, try multiple possible keys
        return editorialVideo.motionDetailSquare || editorialVideo.motionSquareVideo1x1;
    }
    /**
     * Refresh the Apple Music token by fetching from the web player
     * The token is a JWT embedded in Apple's JavaScript bundles
     */
    async refreshToken() {
        // JWT pattern for Apple Music WebPlay token
        const tokenPattern = /eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
        for (const source of TOKEN_SOURCES) {
            try {
                const response = await fetch(source, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                if (!response.ok) {
                    continue;
                }
                const html = await response.text();
                const tokenMatch = html.match(tokenPattern);
                if (tokenMatch) {
                    console.log('Successfully refreshed Apple Music token');
                    return tokenMatch[0];
                }
            }
            catch (error) {
                console.warn(`Failed to fetch token from ${source}:`, error);
            }
        }
        console.error('Could not refresh Apple Music token from any source');
        return null;
    }
    /**
     * Manually set the Apple Music token (useful for configuration)
     */
    setToken(token) {
        this.cachedToken = token;
        this.tokenRefreshAttempted = false;
    }
    /**
     * Get animated artwork and convert to MP4
     * This is the main method for backend use - handles the full pipeline
     */
    async getAnimatedArtworkAsMP4(query, options = {}) {
        const artwork = await this.getArtwork(query);
        if (!artwork || !artwork.hasAnimated || !artwork.videoUrl) {
            return null;
        }
        return this.convertToMP4(artwork, options);
    }
    /**
     * Get animated artwork by album ID and convert to MP4
     */
    async getAnimatedArtworkByIdAsMP4(albumId, options = {}) {
        const artwork = await this.getArtworkById(albumId);
        if (!artwork || !artwork.hasAnimated || !artwork.videoUrl) {
            return null;
        }
        return this.convertToMP4(artwork, options);
    }
    /**
     * Convert an AnimatedArtwork M3U8 stream to MP4
     * Uses core MediaProcessor for FFmpeg operations
     */
    async convertToMP4(artwork, options = {}) {
        if (!artwork.videoUrl) {
            return null;
        }
        const mediaProcessor = (0, sdk_1.getMediaProcessor)();
        // Use settings for defaults
        const conversionOptions = {
            loopCount: options.loopCount ?? this.settings.loopCount,
            filename: options.filename ?? `artwork_${artwork.albumId}_${Date.now()}`,
            ...options
        };
        const result = await mediaProcessor.convertHLSToMP4(artwork.videoUrl, conversionOptions);
        return {
            ...artwork,
            mp4Path: result.outputPath,
            mp4Buffer: result.buffer,
            fileSize: result.size,
            conversionTime: result.duration
        };
    }
    /**
     * Check if FFmpeg is available on the system
     */
    async checkFFmpegAvailable() {
        const mediaProcessor = (0, sdk_1.getMediaProcessor)();
        return mediaProcessor.checkFFmpegAvailable();
    }
    /**
     * Convert to standard ArtworkSet format
     * Includes animated artwork when available and settings allow
     */
    async getArtworkSet(query) {
        const artwork = await this.getArtwork(query);
        if (!artwork) {
            return null;
        }
        const artworkSet = {
            small: this.resizeArtworkUrl(artwork.staticUrl, 100),
            medium: this.resizeArtworkUrl(artwork.staticUrl, 300),
            large: this.resizeArtworkUrl(artwork.staticUrl, 600),
            original: artwork.staticUrl
        };
        // Include animated artwork if available and settings prefer animated
        if (artwork.hasAnimated && artwork.videoUrl && this.settings.artworkType === 'animated') {
            // Convert HLS to MP4 for browser compatibility
            try {
                const converted = await this.convertToMP4(artwork, { returnBuffer: false, cleanup: false });
                if (converted?.mp4Path) {
                    const animatedArtwork = {
                        videoUrl: `file://${converted.mp4Path}`,
                        aspectRatio: artwork.aspectRatio,
                        previewFrame: artwork.previewFrameUrl || artwork.staticUrl,
                        hasAudio: this.settings.includeAudio,
                        albumId: artwork.albumId
                    };
                    artworkSet.animated = animatedArtwork;
                }
            }
            catch (error) {
                console.error('Failed to convert animated artwork:', error);
                // Still return static artwork if conversion fails
            }
        }
        return artworkSet;
    }
    /**
     * Search iTunes for an album
     */
    async searchAlbum(query) {
        const searchTerm = `${query.album} ${query.artist}`.trim();
        const url = `${ITUNES_API}/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=5`;
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        if (data.resultCount === 0) {
            return null;
        }
        // Find best match
        return this.findBestMatch(data.results, query);
    }
    /**
     * Find the best matching album from search results
     */
    findBestMatch(results, query) {
        const firstResult = results[0];
        if (results.length === 0 || !firstResult) {
            return null;
        }
        const normalizedAlbum = this.normalizeString(query.album);
        const normalizedArtist = this.normalizeString(query.artist);
        // Score each result
        let bestMatch = firstResult;
        let bestScore = 0;
        for (const result of results) {
            let score = 0;
            const resultAlbum = this.normalizeString(result.collectionName);
            const resultArtist = this.normalizeString(result.artistName);
            // Album name matching
            if (resultAlbum === normalizedAlbum) {
                score += 50;
            }
            else if (resultAlbum.includes(normalizedAlbum) || normalizedAlbum.includes(resultAlbum)) {
                score += 30;
            }
            // Artist name matching
            if (resultArtist === normalizedArtist) {
                score += 50;
            }
            else if (resultArtist.includes(normalizedArtist) || normalizedArtist.includes(resultArtist)) {
                score += 30;
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = result;
            }
        }
        // Require minimum score for a match
        return bestScore >= 50 ? bestMatch : firstResult;
    }
    /**
     * Resize artwork URL to specified size
     */
    resizeArtworkUrl(url, size) {
        // iTunes artwork URLs contain size info that can be modified
        // e.g., artworkUrl100 -> change 100x100 to desired size
        return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
    }
    /**
     * Normalize string for comparison
     */
    normalizeString(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .trim();
    }
}
exports.AppleMusicArtworkProvider = AppleMusicArtworkProvider;
// Default export for addon loading
exports.default = AppleMusicArtworkProvider;
//# sourceMappingURL=index.js.map
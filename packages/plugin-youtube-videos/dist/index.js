"use strict";
/**
 * YouTube Videos Provider
 * Provides music videos using youtubei.js (same as YouTube Music plugin).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeVideosProvider = void 0;
const sdk_1 = require("@audiio/sdk");
class YouTubeVideosProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'youtube-videos';
    name = 'YouTube Music Videos';
    enrichmentType = 'videos';
    ytWeb = null; // For search (WEB client)
    ytAndroid = null; // For streaming (ANDROID client - direct URLs)
    cache = new Map();
    cacheTTL = 1800000; // 30 minutes
    async initialize() {
        console.log('[YouTube Videos] Initializing with youtubei.js...');
        try {
            // Dynamic import for ESM module
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const ytModule = await dynamicImport('youtubei.js');
            const { Innertube, UniversalCache, ClientType } = ytModule;
            // WEB client for search (parses correctly)
            console.log('[YouTube Videos] Creating WEB client for search...');
            this.ytWeb = await Innertube.create({
                cache: new UniversalCache(true),
                generate_session_locally: true,
            });
            // ANDROID client for streaming (provides direct URLs)
            console.log('[YouTube Videos] Creating ANDROID client for streaming...');
            this.ytAndroid = await Innertube.create({
                client_type: ClientType.ANDROID,
                cache: new UniversalCache(true),
            });
            console.log('[YouTube Videos] Initialized successfully');
        }
        catch (error) {
            console.error('[YouTube Videos] Failed to initialize:', error);
        }
    }
    // Helper to get the search client
    get yt() {
        return this.ytWeb;
    }
    async getArtistVideos(artistName, limit = 10) {
        if (!this.yt) {
            console.warn('[YouTube Videos] Not initialized');
            return [];
        }
        const cacheKey = `${artistName}-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const searchQuery = `${artistName} official music video`;
            console.log(`[YouTube Videos] Searching for: "${searchQuery}"`);
            const results = await this.yt.search(searchQuery, { type: 'video' });
            if (!results.results || results.results.length === 0) {
                console.log('[YouTube Videos] No results found');
                return [];
            }
            const videos = [];
            for (const item of results.results) {
                if (videos.length >= limit)
                    break;
                const video = this.mapSearchResult(item);
                if (video) {
                    videos.push(video);
                }
            }
            console.log(`[YouTube Videos] Found ${videos.length} videos for "${artistName}"`);
            this.cache.set(cacheKey, { data: videos, timestamp: Date.now() });
            return videos;
        }
        catch (error) {
            console.error('[YouTube Videos] Search failed:', error);
            return [];
        }
    }
    async getAlbumVideos(albumTitle, artistName, trackNames, limit = 8) {
        if (!this.yt) {
            console.warn('[YouTube Videos] Not initialized');
            return [];
        }
        const cacheKey = `album-${albumTitle}-${artistName}-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const seenIds = new Set();
            const allVideos = [];
            // Strategy 1: Search for album title + artist
            const albumQuery = `${albumTitle} ${artistName} official`;
            console.log(`[YouTube Videos] Searching album: "${albumQuery}"`);
            const albumResults = await this.yt.search(albumQuery, { type: 'video' });
            if (albumResults.results) {
                for (const item of albumResults.results) {
                    if (allVideos.length >= Math.ceil(limit / 2))
                        break;
                    const video = this.mapSearchResult(item);
                    if (video && !seenIds.has(video.id)) {
                        seenIds.add(video.id);
                        allVideos.push(video);
                    }
                }
            }
            // Strategy 2: Search for individual track titles (top 3)
            if (trackNames && trackNames.length > 0 && allVideos.length < limit) {
                const tracksToSearch = trackNames.slice(0, 3);
                for (const trackName of tracksToSearch) {
                    if (allVideos.length >= limit)
                        break;
                    const trackQuery = `${trackName} ${artistName} official video`;
                    console.log(`[YouTube Videos] Searching track: "${trackQuery}"`);
                    try {
                        const trackResults = await this.yt.search(trackQuery, { type: 'video' });
                        if (trackResults.results) {
                            for (const item of trackResults.results) {
                                if (allVideos.length >= limit)
                                    break;
                                const video = this.mapSearchResult(item);
                                if (video && !seenIds.has(video.id)) {
                                    seenIds.add(video.id);
                                    allVideos.push(video);
                                }
                            }
                        }
                    }
                    catch (trackError) {
                        console.warn(`[YouTube Videos] Track search failed for "${trackName}":`, trackError);
                    }
                }
            }
            console.log(`[YouTube Videos] Found ${allVideos.length} videos for album "${albumTitle}"`);
            this.cache.set(cacheKey, { data: allVideos, timestamp: Date.now() });
            return allVideos;
        }
        catch (error) {
            console.error('[YouTube Videos] Album search failed:', error);
            return [];
        }
    }
    async getVideoStream(videoId, preferredQuality = '720p') {
        if (!this.ytAndroid) {
            console.warn('[YouTube Videos] Not initialized');
            return null;
        }
        try {
            console.log(`[YouTube Videos] Getting stream for video: ${videoId}, quality: ${preferredQuality}`);
            const preferredHeight = parseInt(preferredQuality.replace('p', '')) || 720;
            // Approach 1: Try YouTube Music endpoint (works well for music videos)
            try {
                console.log('[YouTube Videos] Trying music.getInfo()...');
                const musicInfo = await this.ytAndroid.music.getInfo(videoId);
                if (musicInfo) {
                    const streamingData = musicInfo.streaming_data;
                    if (streamingData?.adaptive_formats) {
                        // Find best video format with direct URL
                        const videoFormats = streamingData.adaptive_formats
                            .filter(f => f.mime_type?.includes('video') && f.url && !f.signatureCipher)
                            .sort((a, b) => (b.height || 0) - (a.height || 0));
                        const audioFormats = streamingData.adaptive_formats
                            .filter(f => f.mime_type?.includes('audio') && f.url && !f.signatureCipher)
                            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                        // Find best video at or below preferred quality
                        const bestVideo = videoFormats.find(f => (f.height || 0) <= preferredHeight) || videoFormats[videoFormats.length - 1];
                        const bestAudio = audioFormats[0];
                        if (bestVideo?.url) {
                            console.log(`[YouTube Videos] Got video from music.getInfo: ${bestVideo.quality_label}`);
                            return {
                                url: String(bestVideo.url),
                                mimeType: String(bestVideo.mime_type?.split(';')[0] || 'video/mp4'),
                                quality: String(bestVideo.quality_label || `${bestVideo.height}p`),
                                width: bestVideo.width,
                                height: bestVideo.height,
                                audioOnly: false,
                                audioUrl: bestAudio?.url ? String(bestAudio.url) : undefined,
                                audioMimeType: bestAudio?.mime_type?.split(';')[0],
                                expiresAt: Date.now() + 3600000,
                            };
                        }
                    }
                }
            }
            catch (musicError) {
                console.log('[YouTube Videos] music.getInfo() failed:', musicError);
            }
            // Approach 2: Try getBasicInfo like YTMusic does
            try {
                console.log('[YouTube Videos] Trying getBasicInfo()...');
                const basicInfo = await this.ytAndroid.getBasicInfo(videoId);
                const streamingData = basicInfo.streaming_data;
                if (streamingData) {
                    console.log('[YouTube Videos] Streaming data:', 'formats:', streamingData.formats?.length || 0, 'adaptive:', streamingData.adaptive_formats?.length || 0);
                    // Check combined formats first
                    if (streamingData.formats) {
                        for (const format of streamingData.formats) {
                            const f = format;
                            console.log('[YouTube Videos] Format:', f.mime_type, 'URL:', !!f.url, 'Cipher:', !!f.signatureCipher);
                            if (f.url && !f.signatureCipher && f.mime_type?.includes('video')) {
                                console.log(`[YouTube Videos] Found direct URL: ${f.quality_label}`);
                                return {
                                    url: String(f.url),
                                    mimeType: String(f.mime_type?.split(';')[0] || 'video/mp4'),
                                    quality: String(f.quality_label || preferredQuality),
                                    width: f.width,
                                    height: f.height,
                                    audioOnly: false,
                                    expiresAt: Date.now() + 3600000,
                                };
                            }
                        }
                    }
                    // Check adaptive formats
                    if (streamingData.adaptive_formats) {
                        let bestVideo = null;
                        let bestAudio = null;
                        for (const format of streamingData.adaptive_formats) {
                            const f = format;
                            if (!f.url || f.signatureCipher)
                                continue;
                            if (f.mime_type?.includes('video')) {
                                const height = f.height || 0;
                                if (!bestVideo || (height <= preferredHeight && height > (bestVideo.height || 0))) {
                                    bestVideo = f;
                                }
                            }
                            else if (f.mime_type?.includes('audio')) {
                                if (!bestAudio || (f.bitrate || 0) > (bestAudio.bitrate || 0)) {
                                    bestAudio = f;
                                }
                            }
                        }
                        if (bestVideo?.url) {
                            console.log(`[YouTube Videos] Found adaptive video: ${bestVideo.quality_label}`);
                            return {
                                url: String(bestVideo.url),
                                mimeType: String(bestVideo.mime_type?.split(';')[0] || 'video/mp4'),
                                quality: String(bestVideo.quality_label || `${bestVideo.height}p`),
                                width: bestVideo.width,
                                height: bestVideo.height,
                                audioOnly: false,
                                audioUrl: bestAudio?.url ? String(bestAudio.url) : undefined,
                                audioMimeType: bestAudio?.mime_type?.split(';')[0],
                                expiresAt: Date.now() + 3600000,
                            };
                        }
                    }
                }
            }
            catch (basicError) {
                console.log('[YouTube Videos] getBasicInfo() failed:', basicError);
            }
            console.error('[YouTube Videos] No suitable format found');
            return null;
        }
        catch (error) {
            console.error('[YouTube Videos] Failed to get video stream:', error);
            return null;
        }
    }
    mapSearchResult(item) {
        const video = item;
        // Only process video types
        if (video.type !== 'Video') {
            return null;
        }
        const id = video.id;
        if (!id)
            return null;
        // Extract title
        let title = '';
        if (typeof video.title === 'string') {
            title = video.title;
        }
        else if (video.title?.text) {
            title = video.title.text;
        }
        if (!title)
            return null;
        // Extract view count
        let viewCount = 0;
        const viewText = video.short_view_count?.text || video.view_count?.text || '';
        if (viewText) {
            viewCount = this.parseViewCount(viewText);
        }
        // Extract duration
        let duration = '';
        if (video.duration?.seconds) {
            duration = this.formatDuration(video.duration.seconds);
        }
        else if (video.duration?.text) {
            duration = video.duration.text;
        }
        // Extract thumbnail
        let thumbnail = '';
        if (video.best_thumbnail?.url) {
            thumbnail = video.best_thumbnail.url;
        }
        else if (video.thumbnails && video.thumbnails.length > 0) {
            // Get highest quality thumbnail
            const sorted = [...video.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
            thumbnail = sorted[0]?.url || '';
        }
        if (!thumbnail) {
            thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
        }
        return {
            id,
            title,
            thumbnail,
            publishedAt: video.published?.text || '',
            viewCount,
            duration,
            url: `https://www.youtube.com/watch?v=${id}`,
            source: 'youtube',
        };
    }
    parseViewCount(text) {
        // Parse "1.2M views", "500K views", etc.
        const match = text.match(/([\d.]+)\s*([KMB])?/i);
        if (!match)
            return 0;
        let num = parseFloat(match[1]);
        const suffix = match[2]?.toUpperCase();
        if (suffix === 'K')
            num *= 1000;
        else if (suffix === 'M')
            num *= 1000000;
        else if (suffix === 'B')
            num *= 1000000000;
        return Math.round(num);
    }
    formatDuration(seconds) {
        if (!seconds || seconds <= 0)
            return '';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
exports.YouTubeVideosProvider = YouTubeVideosProvider;
exports.default = YouTubeVideosProvider;
//# sourceMappingURL=index.js.map
"use strict";
/**
 * YouTube Videos Provider
 * Provides music videos from YouTube Data API v3.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeVideosProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
class YouTubeVideosProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'youtube-videos';
    name = 'YouTube Music Videos';
    enrichmentType = 'videos';
    apiKey = '';
    cache = new Map();
    cacheTTL = 1800000; // 30 minutes
    async initialize() {
        console.log('[YouTube Videos] Initializing...');
    }
    updateSettings(settings) {
        if (settings.apiKey) {
            this.apiKey = settings.apiKey;
        }
    }
    async getArtistVideos(artistName, limit = 10) {
        if (!this.apiKey)
            return [];
        const cacheKey = `${artistName}-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const searchQuery = `${artistName} official music video`;
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: searchQuery,
                type: 'video',
                videoCategoryId: '10',
                maxResults: String(limit),
                order: 'relevance',
                key: this.apiKey,
            });
            const searchResponse = await fetch(`${YOUTUBE_API_URL}/search?${searchParams}`);
            if (!searchResponse.ok)
                throw new Error(`HTTP ${searchResponse.status}`);
            const searchData = (await searchResponse.json());
            const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
            if (!videoIds)
                return [];
            const detailsParams = new URLSearchParams({
                part: 'contentDetails,statistics',
                id: videoIds,
                key: this.apiKey,
            });
            const detailsResponse = await fetch(`${YOUTUBE_API_URL}/videos?${detailsParams}`);
            const detailsData = (await detailsResponse.json());
            const detailsMap = new Map(detailsData.items.map((item) => [
                item.id,
                {
                    duration: this.parseDuration(item.contentDetails.duration),
                    viewCount: parseInt(item.statistics.viewCount, 10) || 0,
                },
            ]));
            const videos = searchData.items.map((item) => {
                const details = detailsMap.get(item.id.videoId);
                return {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
                    publishedAt: item.snippet.publishedAt,
                    viewCount: details?.viewCount,
                    duration: details?.duration,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    source: 'youtube',
                };
            });
            this.cache.set(cacheKey, { data: videos, timestamp: Date.now() });
            return videos;
        }
        catch (error) {
            console.error('[YouTube Videos] Failed:', error);
            return [];
        }
    }
    parseDuration(isoDuration) {
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return '';
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
exports.YouTubeVideosProvider = YouTubeVideosProvider;
exports.default = YouTubeVideosProvider;
//# sourceMappingURL=index.js.map
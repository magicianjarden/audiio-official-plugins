"use strict";
/**
 * YouTube Videos Provider
 * Provides music videos using Piped API (no auth required).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeVideosProvider = void 0;
const sdk_1 = require("@audiio/sdk");
// Piped API instances (no auth required)
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.yt',
];
class YouTubeVideosProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'youtube-videos';
    name = 'YouTube Music Videos';
    enrichmentType = 'videos';
    cache = new Map();
    cacheTTL = 1800000; // 30 minutes
    currentInstance = 0;
    async initialize() {
        console.log('[YouTube Videos] Initializing with Piped API...');
    }
    async fetchWithFallback(path) {
        let lastError = null;
        for (let i = 0; i < PIPED_INSTANCES.length; i++) {
            const instanceIndex = (this.currentInstance + i) % PIPED_INSTANCES.length;
            const instance = PIPED_INSTANCES[instanceIndex];
            try {
                const response = await fetch(`${instance}${path}`, {
                    headers: { Accept: 'application/json' },
                });
                if (response.ok) {
                    this.currentInstance = instanceIndex;
                    return response;
                }
            }
            catch (error) {
                lastError = error;
                console.warn(`[YouTube Videos] Instance ${instance} failed, trying next...`);
            }
        }
        throw lastError || new Error('All Piped instances failed');
    }
    async getArtistVideos(artistName, limit = 10) {
        const cacheKey = `${artistName}-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const searchQuery = `${artistName} official music video`;
            const response = await this.fetchWithFallback(`/search?q=${encodeURIComponent(searchQuery)}&filter=music_videos`);
            const data = (await response.json());
            if (!data.items || data.items.length === 0) {
                // Try without filter
                const fallbackResponse = await this.fetchWithFallback(`/search?q=${encodeURIComponent(searchQuery)}&filter=videos`);
                const fallbackData = (await fallbackResponse.json());
                data.items = fallbackData.items || [];
            }
            const videos = data.items
                .filter((item) => item.type === 'stream')
                .slice(0, limit)
                .map((item) => {
                // Extract video ID from URL (format: /watch?v=VIDEO_ID)
                const videoId = item.url.replace('/watch?v=', '');
                return {
                    id: videoId,
                    title: item.title,
                    thumbnail: item.thumbnail,
                    publishedAt: item.uploadedDate || '',
                    viewCount: item.views || 0,
                    duration: this.formatDuration(item.duration),
                    url: `https://www.youtube.com/watch?v=${videoId}`,
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
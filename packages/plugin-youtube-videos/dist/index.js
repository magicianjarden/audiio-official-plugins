"use strict";
/**
 * YouTube Videos Provider
 * Provides music videos using Invidious API (no auth required).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeVideosProvider = void 0;
const sdk_1 = require("@audiio/sdk");
// Invidious API instances (more reliable than Piped)
const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.jing.rocks',
    'https://yt.cdaut.de',
    'https://invidious.privacyredirect.com',
];
class YouTubeVideosProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'youtube-videos';
    name = 'YouTube Music Videos';
    enrichmentType = 'videos';
    cache = new Map();
    cacheTTL = 1800000; // 30 minutes
    currentInstance = 0;
    async initialize() {
        console.log('[YouTube Videos] Initializing with Invidious API...');
    }
    async fetchWithFallback(path) {
        let lastError = null;
        for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
            const instanceIndex = (this.currentInstance + i) % INVIDIOUS_INSTANCES.length;
            const instance = INVIDIOUS_INSTANCES[instanceIndex];
            try {
                console.log(`[YouTube Videos] Trying instance: ${instance}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                const response = await fetch(`${instance}${path}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    this.currentInstance = instanceIndex;
                    return response;
                }
                console.warn(`[YouTube Videos] Instance ${instance} returned ${response.status}`);
            }
            catch (error) {
                lastError = error;
                console.warn(`[YouTube Videos] Instance ${instance} failed:`, error.message);
            }
        }
        throw lastError || new Error('All Invidious instances failed');
    }
    async getArtistVideos(artistName, limit = 10) {
        const cacheKey = `${artistName}-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const searchQuery = `${artistName} official music video`;
            const response = await this.fetchWithFallback(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video&sort_by=relevance`);
            const data = (await response.json());
            if (!Array.isArray(data) || data.length === 0) {
                console.log('[YouTube Videos] No results found');
                return [];
            }
            const videos = data
                .filter((item) => item.type === 'video')
                .slice(0, limit)
                .map((item) => {
                // Get the best thumbnail
                const thumbnail = item.videoThumbnails?.find(t => t.quality === 'medium')
                    || item.videoThumbnails?.find(t => t.quality === 'high')
                    || item.videoThumbnails?.[0];
                return {
                    id: item.videoId,
                    title: item.title,
                    thumbnail: thumbnail?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
                    publishedAt: item.publishedText || '',
                    viewCount: item.viewCount || 0,
                    duration: this.formatDuration(item.lengthSeconds),
                    url: `https://www.youtube.com/watch?v=${item.videoId}`,
                    source: 'youtube',
                };
            });
            console.log(`[YouTube Videos] Found ${videos.length} videos for "${artistName}"`);
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
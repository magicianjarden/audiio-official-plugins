"use strict";
/**
 * Fanart.tv Provider
 * Provides high-quality artist images from Fanart.tv API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanartProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const FANART_API_URL = 'https://webservice.fanart.tv/v3/music';
class FanartProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'fanart';
    name = 'Fanart.tv';
    enrichmentType = 'gallery';
    apiKey = '';
    cache = new Map();
    cacheTTL = 3600000; // 1 hour
    async initialize() {
        console.log('[Fanart.tv] Initializing...');
    }
    updateSettings(settings) {
        if (settings.apiKey) {
            this.apiKey = settings.apiKey;
        }
    }
    async getArtistGallery(mbid) {
        if (!this.apiKey) {
            return this.emptyResult();
        }
        const cached = this.cache.get(mbid);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const response = await fetch(`${FANART_API_URL}/${mbid}?api_key=${this.apiKey}`);
            if (!response.ok) {
                if (response.status === 404)
                    return this.emptyResult();
                throw new Error(`HTTP ${response.status}`);
            }
            const data = (await response.json());
            const result = this.transformResponse(data);
            this.cache.set(mbid, { data: result, timestamp: Date.now() });
            return result;
        }
        catch (error) {
            console.error('[Fanart.tv] Failed to fetch:', error);
            return this.emptyResult();
        }
    }
    transformResponse(data) {
        return {
            backgrounds: (data.artistbackground || []).map((img) => ({
                url: img.url,
                likes: parseInt(img.likes, 10) || 0,
            })),
            thumbs: (data.artistthumb || []).map((img) => ({
                url: img.url,
                likes: parseInt(img.likes, 10) || 0,
            })),
            logos: (data.musiclogo || []).map((img) => ({
                url: img.url,
                likes: parseInt(img.likes, 10) || 0,
            })),
            hdLogos: (data.hdmusiclogo || []).map((img) => ({
                url: img.url,
                likes: parseInt(img.likes, 10) || 0,
            })),
            banners: (data.musicbanner || []).map((img) => ({
                url: img.url,
                likes: parseInt(img.likes, 10) || 0,
            })),
        };
    }
    emptyResult() {
        return { backgrounds: [], thumbs: [], logos: [], hdLogos: [], banners: [] };
    }
}
exports.FanartProvider = FanartProvider;
exports.default = FanartProvider;
//# sourceMappingURL=index.js.map
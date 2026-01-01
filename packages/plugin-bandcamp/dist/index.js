"use strict";
/**
 * Bandcamp Provider
 * Provides merchandise detection by searching Bandcamp.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BandcampProvider = void 0;
const sdk_1 = require("@audiio/sdk");
class BandcampProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'bandcamp';
    name = 'Bandcamp Merch';
    enrichmentType = 'merchandise';
    cache = new Map();
    cacheTTL = 3600000; // 1 hour
    async initialize() {
        console.log('[Bandcamp] Initializing...');
    }
    async findArtistOnBandcamp(artistName) {
        try {
            const searchUrl = `https://bandcamp.com/search?q=${encodeURIComponent(artistName)}&item_type=b`;
            const response = await fetch(searchUrl, {
                headers: { 'User-Agent': 'Audiio/1.0' },
            });
            if (!response.ok)
                return null;
            const html = await response.text();
            const bandMatch = html.match(/<li class="searchresult band"[\s\S]*?<a href="(https:\/\/[^"]+\.bandcamp\.com\/?)"/);
            if (bandMatch) {
                const artistUrl = bandMatch[1];
                const nameMatch = html.match(/<li class="searchresult band"[\s\S]*?class="heading"[^>]*>([^<]+)/);
                const name = nameMatch ? nameMatch[1].trim() : artistName;
                return {
                    name,
                    url: artistUrl,
                    merchUrl: `${artistUrl.replace(/\/$/, '')}/merch`,
                };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async getMerchandiseUrl(artistName) {
        const cacheKey = artistName.toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const artist = await this.findArtistOnBandcamp(artistName);
            if (!artist || !artist.merchUrl) {
                this.cache.set(cacheKey, { data: null, timestamp: Date.now() });
                return null;
            }
            // Try to verify merch page exists
            try {
                const merchResponse = await fetch(artist.merchUrl, {
                    method: 'HEAD',
                    headers: { 'User-Agent': 'Audiio/1.0' },
                });
                if (merchResponse.ok) {
                    this.cache.set(cacheKey, { data: artist.merchUrl, timestamp: Date.now() });
                    return artist.merchUrl;
                }
            }
            catch {
                // If HEAD fails, just return the artist page
            }
            this.cache.set(cacheKey, { data: artist.url, timestamp: Date.now() });
            return artist.url;
        }
        catch (error) {
            console.error('[Bandcamp] Failed:', error);
            this.cache.set(cacheKey, { data: null, timestamp: Date.now() });
            return null;
        }
    }
}
exports.BandcampProvider = BandcampProvider;
exports.default = BandcampProvider;
//# sourceMappingURL=index.js.map
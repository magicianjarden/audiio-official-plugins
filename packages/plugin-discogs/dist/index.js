"use strict";
/**
 * Discogs Provider
 * Provides artist timeline/discography from Discogs API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscogsProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const DISCOGS_API_URL = 'https://api.discogs.com';
class DiscogsProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'discogs';
    name = 'Discogs Timeline';
    enrichmentType = 'timeline';
    apiKey = '';
    apiSecret = '';
    cache = new Map();
    cacheTTL = 3600000; // 1 hour
    async initialize() {
        console.log('[Discogs] Initializing...');
    }
    updateSettings(settings) {
        if (settings.apiKey)
            this.apiKey = settings.apiKey;
        if (settings.apiSecret)
            this.apiSecret = settings.apiSecret;
    }
    async searchArtist(artistName) {
        try {
            const params = new URLSearchParams({ q: artistName, type: 'artist', per_page: '5' });
            if (this.apiKey) {
                params.append('key', this.apiKey);
                if (this.apiSecret)
                    params.append('secret', this.apiSecret);
            }
            const response = await fetch(`${DISCOGS_API_URL}/database/search?${params}`, {
                headers: { 'User-Agent': 'Audiio/1.0' },
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return { id: String(data.results[0].id), name: data.results[0].title };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async getArtistTimeline(artistName) {
        const cacheKey = artistName.toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const artist = await this.searchArtist(artistName);
            if (!artist)
                return [];
            const params = new URLSearchParams({ sort: 'year', sort_order: 'asc', per_page: '100' });
            if (this.apiKey) {
                params.append('key', this.apiKey);
                if (this.apiSecret)
                    params.append('secret', this.apiSecret);
            }
            const response = await fetch(`${DISCOGS_API_URL}/artists/${artist.id}/releases?${params}`, {
                headers: { 'User-Agent': 'Audiio/1.0' },
            });
            if (!response.ok)
                return [];
            const data = await response.json();
            const mainRoles = ['Main', 'TrackAppearance'];
            const releases = data.releases
                .filter((r) => r.year && r.year > 0)
                .filter((r) => mainRoles.includes(r.role) || !r.role);
            const seenTitles = new Set();
            const timeline = [];
            for (const release of releases) {
                const key = `${release.year}-${release.title.toLowerCase().trim()}`;
                if (seenTitles.has(key))
                    continue;
                seenTitles.add(key);
                timeline.push({
                    year: release.year,
                    type: this.determineReleaseType(release.format),
                    title: release.title,
                    artwork: release.thumb || undefined,
                    label: release.label || undefined,
                    id: String(release.id),
                    source: 'discogs',
                });
            }
            timeline.sort((a, b) => a.year - b.year);
            this.cache.set(cacheKey, { data: timeline, timestamp: Date.now() });
            return timeline;
        }
        catch (error) {
            console.error('[Discogs] Failed:', error);
            return [];
        }
    }
    determineReleaseType(format) {
        if (!format)
            return 'album';
        const f = format.toLowerCase();
        if (f.includes('single') || f.includes('7"'))
            return 'single';
        if (f.includes('ep') || f.includes('mini'))
            return 'ep';
        if (f.includes('comp'))
            return 'compilation';
        if (f.includes('live'))
            return 'live';
        return 'album';
    }
}
exports.DiscogsProvider = DiscogsProvider;
exports.default = DiscogsProvider;
//# sourceMappingURL=index.js.map
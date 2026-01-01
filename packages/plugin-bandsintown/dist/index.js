"use strict";
/**
 * Bandsintown Provider
 * Provides upcoming concert information from Bandsintown API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BandsintownProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const BANDSINTOWN_API_URL = 'https://rest.bandsintown.com';
class BandsintownProvider extends sdk_1.BaseArtistEnrichmentProvider {
    id = 'bandsintown';
    name = 'Bandsintown Concerts';
    enrichmentType = 'concerts';
    appId = 'audiio';
    cache = new Map();
    cacheTTL = 1800000; // 30 minutes
    async initialize() {
        console.log('[Bandsintown] Initializing...');
    }
    async getUpcomingConcerts(artistName) {
        const cacheKey = artistName.toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            const encodedArtist = encodeURIComponent(artistName);
            const url = `${BANDSINTOWN_API_URL}/artists/${encodedArtist}/events?app_id=${this.appId}`;
            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                if (response.status === 404)
                    return [];
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data))
                return [];
            const events = data;
            const concerts = events.map((event) => ({
                id: event.id,
                datetime: event.datetime,
                venue: {
                    name: event.venue.name,
                    city: event.venue.city,
                    region: event.venue.region || undefined,
                    country: event.venue.country,
                },
                lineup: event.lineup,
                ticketUrl: event.offers[0]?.url || event.url,
                onSaleDate: event.on_sale_datetime || undefined,
                offers: event.offers,
                source: 'bandsintown',
            }));
            this.cache.set(cacheKey, { data: concerts, timestamp: Date.now() });
            return concerts;
        }
        catch (error) {
            console.error('[Bandsintown] Failed:', error);
            return [];
        }
    }
}
exports.BandsintownProvider = BandsintownProvider;
exports.default = BandsintownProvider;
//# sourceMappingURL=index.js.map
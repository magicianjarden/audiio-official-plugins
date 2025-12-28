"use strict";
/**
 * LRCLib Lyrics Provider
 * Provides synchronized lyrics from LRCLib API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRCLibProvider = void 0;
const sdk_1 = require("@audiio/sdk");
const LRCLIB_API = 'https://lrclib.net/api';
class LRCLibProvider extends sdk_1.BaseLyricsProvider {
    id = 'lrclib';
    name = 'LRCLib';
    supportsSynced = true;
    async getLyrics(query, _options) {
        try {
            const params = new URLSearchParams({
                track_name: query.title,
                artist_name: query.artist
            });
            if (query.album) {
                params.set('album_name', query.album);
            }
            if (query.duration) {
                params.set('duration', String(query.duration));
            }
            const response = await fetch(`${LRCLIB_API}/get?${params}`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            if (!data.syncedLyrics && !data.plainLyrics) {
                return null;
            }
            return {
                synced: data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : undefined,
                plain: data.plainLyrics,
                source: 'lrclib'
            };
        }
        catch {
            return null;
        }
    }
}
exports.LRCLibProvider = LRCLibProvider;
exports.default = LRCLibProvider;
//# sourceMappingURL=index.js.map
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
    get manifest() {
        return {
            id: 'lrclib',
            name: 'LRCLib',
            version: '1.0.0',
            description: 'Synchronized lyrics from the LRCLib community database',
            author: 'Audiio',
            roles: ['lyrics-provider'],
            privacy: {
                collects: false,
                sharesWithThirdParties: false,
                tracksAcrossApps: false,
                dataAccess: [
                    {
                        category: 'library-data',
                        usage: ['service-functionality'],
                        required: true,
                        userFriendlyLabel: 'Track Information',
                        userFriendlyDesc: 'Song title, artist, album, and duration for lyrics lookup',
                        technicalDesc: 'track_name, artist_name, album_name, duration parameters'
                    }
                ],
                networkAccess: [
                    {
                        host: 'lrclib.net',
                        purpose: 'Fetch synchronized lyrics',
                        dataTypes: ['library-data']
                    }
                ],
                localStorageUsed: false,
                dataRetention: 'session',
                lastUpdated: '2025-01-06'
            }
        };
    }
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
                // Include raw LRC for client-side parsing
                _rawSynced: data.syncedLyrics,
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
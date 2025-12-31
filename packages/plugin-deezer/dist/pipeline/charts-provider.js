"use strict";
/**
 * Deezer Charts Data Provider
 *
 * Provides chart/trending tracks to the Discover "See All" pipeline.
 * Can contribute tracks for trending, new releases, and genre-based sections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deezerChartsProvider = void 0;
exports.setDeezerProvider = setDeezerProvider;
const fetch_utils_1 = require("../fetch-utils");
const PLUGIN_ID = 'deezer';
const DEEZER_API = 'https://api.deezer.com';
/**
 * Convert MetadataTrack to UnifiedTrack format
 */
function toUnifiedTrack(track) {
    return {
        id: `deezer:${track.id}`,
        title: track.title,
        artists: track.artists || [],
        album: track.album,
        duration: track.duration || 0,
        artwork: track.artwork,
        explicit: track.explicit,
        streamSources: [],
        _meta: {
            metadataProvider: 'deezer',
            matchConfidence: 1,
            externalIds: track.externalIds || { deezer: track.id },
            lastUpdated: new Date(),
        },
    };
}
exports.deezerChartsProvider = {
    id: `${PLUGIN_ID}:charts`,
    pluginId: PLUGIN_ID,
    priority: 60,
    name: 'Deezer Charts',
    description: 'Provides trending tracks from Deezer charts',
    canProvide(query) {
        // Provide for trending, charts, new releases, and genre sections
        return (query.sectionType === 'trending' ||
            query.sectionType === 'charts' ||
            query.sectionType === 'new-releases' ||
            query.sectionType === 'genre' ||
            query.sectionType === 'top-hits' ||
            (query.strategy === 'plugin' &&
                (query.pluginHooks?.dataProviders?.includes(`${PLUGIN_ID}:charts`) ?? false)));
    },
    async provide(context) {
        const limit = context.query.limit || 20;
        try {
            // Use genre-specific charts if available
            if (context.query.sectionType === 'genre' &&
                context.query.embedding?.genre) {
                return await fetchGenreTracks(context.query.embedding.genre, limit);
            }
            // Otherwise fetch general charts
            const provider = getDeezerProvider();
            if (provider) {
                const charts = await provider.getCharts(limit);
                return charts.tracks.map(toUnifiedTrack);
            }
            // Fallback: direct API call
            return await fetchChartTracks(limit);
        }
        catch (error) {
            console.error('[DeezerCharts] Failed to fetch:', error);
            return [];
        }
    },
};
/**
 * Fetch chart tracks directly from API
 */
async function fetchChartTracks(limit) {
    try {
        const data = await (0, fetch_utils_1.protectedFetchJson)(`${DEEZER_API}/chart/0/tracks?limit=${limit}`);
        return data.data.map((track) => ({
            id: `deezer:${track.id}`,
            title: track.title,
            artists: [
                {
                    id: String(track.artist.id),
                    name: track.artist.name,
                    artwork: track.artist.picture_medium
                        ? { medium: track.artist.picture_medium }
                        : undefined,
                },
            ],
            album: track.album
                ? {
                    id: String(track.album.id),
                    title: track.album.title,
                    artwork: track.album.cover_medium
                        ? {
                            medium: track.album.cover_medium,
                            large: track.album.cover_big,
                        }
                        : undefined,
                }
                : undefined,
            duration: track.duration,
            explicit: track.explicit_lyrics,
            streamSources: [],
            _meta: {
                metadataProvider: 'deezer',
                matchConfidence: 1,
                externalIds: { deezer: String(track.id) },
                lastUpdated: new Date(),
            },
        }));
    }
    catch {
        return [];
    }
}
/**
 * Fetch genre-specific tracks
 */
async function fetchGenreTracks(genre, limit) {
    try {
        // First, get the genre ID
        const genresData = await (0, fetch_utils_1.protectedFetchJson)(`${DEEZER_API}/genre`);
        // Find matching genre
        const genreLower = genre.toLowerCase();
        const matchedGenre = genresData.data.find((g) => g.name.toLowerCase() === genreLower ||
            g.name.toLowerCase().includes(genreLower));
        if (!matchedGenre) {
            console.log(`[DeezerCharts] Genre "${genre}" not found in Deezer genres`);
            return [];
        }
        // Fetch genre chart
        const chartData = await (0, fetch_utils_1.protectedFetchJson)(`${DEEZER_API}/chart/${matchedGenre.id}/tracks?limit=${limit}`);
        return chartData.data.map((track) => ({
            id: `deezer:${track.id}`,
            title: track.title,
            artists: [{ id: String(track.artist.id), name: track.artist.name }],
            album: track.album
                ? {
                    id: String(track.album.id),
                    title: track.album.title,
                    artwork: track.album.cover_medium
                        ? { medium: track.album.cover_medium }
                        : undefined,
                }
                : undefined,
            duration: track.duration,
            explicit: track.explicit_lyrics,
            streamSources: [],
            _meta: {
                metadataProvider: 'deezer',
                matchConfidence: 1,
                externalIds: { deezer: String(track.id) },
                lastUpdated: new Date(),
            },
        }));
    }
    catch {
        return [];
    }
}
// Singleton provider instance
let deezerProviderInstance = null;
function getDeezerProvider() {
    return deezerProviderInstance;
}
function setDeezerProvider(provider) {
    deezerProviderInstance = provider;
}
//# sourceMappingURL=charts-provider.js.map
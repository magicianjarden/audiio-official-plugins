/**
 * YouTube Videos Provider
 * Provides music videos using Invidious API (no auth required).
 */
import { BaseArtistEnrichmentProvider, type MusicVideo } from '@audiio/sdk';
export declare class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
    readonly id = "youtube-videos";
    readonly name = "YouTube Music Videos";
    readonly enrichmentType: "videos";
    private cache;
    private cacheTTL;
    private currentInstance;
    initialize(): Promise<void>;
    private fetchWithFallback;
    getArtistVideos(artistName: string, limit?: number): Promise<MusicVideo[]>;
    private formatDuration;
}
export default YouTubeVideosProvider;
//# sourceMappingURL=index.d.ts.map
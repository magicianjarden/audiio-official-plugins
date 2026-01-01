/**
 * YouTube Videos Provider
 * Provides music videos from YouTube Data API v3.
 */
import { BaseArtistEnrichmentProvider, type MusicVideo } from '@audiio/sdk';
interface YouTubeSettings {
    apiKey: string;
}
export declare class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
    readonly id = "youtube-videos";
    readonly name = "YouTube Music Videos";
    readonly enrichmentType: "videos";
    private apiKey;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    updateSettings(settings: Partial<YouTubeSettings>): void;
    getArtistVideos(artistName: string, limit?: number): Promise<MusicVideo[]>;
    private parseDuration;
}
export default YouTubeVideosProvider;
//# sourceMappingURL=index.d.ts.map
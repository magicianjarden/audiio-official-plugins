/**
 * YouTube Videos Provider
 * Provides music videos using youtubei.js (same as YouTube Music plugin).
 */
import { BaseArtistEnrichmentProvider, type MusicVideo, type VideoStreamInfo } from '@audiio/sdk';
export declare class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
    readonly id = "youtube-videos";
    readonly name = "YouTube Music Videos";
    readonly enrichmentType: "videos";
    private ytWeb;
    private ytAndroid;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    private get yt();
    getArtistVideos(artistName: string, limit?: number): Promise<MusicVideo[]>;
    getAlbumVideos(albumTitle: string, artistName: string, trackNames?: string[], limit?: number): Promise<MusicVideo[]>;
    getVideoStream(videoId: string, preferredQuality?: string): Promise<VideoStreamInfo | null>;
    private mapSearchResult;
    private parseViewCount;
    private formatDuration;
}
export default YouTubeVideosProvider;
//# sourceMappingURL=index.d.ts.map
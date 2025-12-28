/**
 * YouTube Music Stream Provider
 * Provides audio streams from YouTube Music using youtubei.js
 */
import { BaseStreamProvider, type StreamTrack, type StreamSearchOptions, type StreamInfo, type Quality } from '@audiio/sdk';
export declare class YouTubeMusicProvider extends BaseStreamProvider {
    readonly id = "youtube-music";
    readonly name = "YouTube Music";
    readonly requiresAuth = false;
    readonly supportedQualities: Quality[];
    private yt;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    isAuthenticated(): boolean;
    search(query: string, options?: StreamSearchOptions): Promise<StreamTrack[]>;
    searchByMetadata(metadata: {
        title: string;
        artist: string;
        album?: string;
        duration?: number;
        isrc?: string;
    }): Promise<StreamTrack | null>;
    getStream(trackId: string, quality?: Quality): Promise<StreamInfo>;
    private mapSearchResult;
    private parseDurationText;
    private mapMimeType;
}
export default YouTubeMusicProvider;
//# sourceMappingURL=index.d.ts.map
/**
 * Fanart Provider
 * Provides high-quality artist images from TheAudioDB (free, no auth required).
 */
import { BaseArtistEnrichmentProvider, type ArtistImages } from '@audiio/sdk';
export declare class FanartProvider extends BaseArtistEnrichmentProvider {
    readonly id = "fanart";
    readonly name = "Artist Gallery";
    readonly enrichmentType: "gallery";
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    getArtistGallery(mbid: string, artistName?: string): Promise<ArtistImages>;
    private transformResponse;
    private emptyResult;
}
export default FanartProvider;
//# sourceMappingURL=index.d.ts.map
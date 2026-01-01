/**
 * Fanart.tv Provider
 * Provides high-quality artist images from Fanart.tv API.
 */
import { BaseArtistEnrichmentProvider, type ArtistImages } from '@audiio/sdk';
interface FanartSettings {
    apiKey: string;
}
export declare class FanartProvider extends BaseArtistEnrichmentProvider {
    readonly id = "fanart";
    readonly name = "Fanart.tv";
    readonly enrichmentType: "gallery";
    private apiKey;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    updateSettings(settings: Partial<FanartSettings>): void;
    getArtistGallery(mbid: string): Promise<ArtistImages>;
    private transformResponse;
    private emptyResult;
}
export default FanartProvider;
//# sourceMappingURL=index.d.ts.map
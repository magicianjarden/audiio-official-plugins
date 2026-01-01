/**
 * Bandcamp Provider
 * Provides merchandise detection by searching Bandcamp.
 */
import { BaseArtistEnrichmentProvider } from '@audiio/sdk';
export declare class BandcampProvider extends BaseArtistEnrichmentProvider {
    readonly id = "bandcamp";
    readonly name = "Bandcamp Merch";
    readonly enrichmentType: "merchandise";
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    private findArtistOnBandcamp;
    getMerchandiseUrl(artistName: string): Promise<string | null>;
}
export default BandcampProvider;
//# sourceMappingURL=index.d.ts.map
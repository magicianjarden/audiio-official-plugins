/**
 * Bandsintown Provider
 * Provides upcoming concert information from Bandsintown API.
 */
import { BaseArtistEnrichmentProvider, type Concert } from '@audiio/sdk';
export declare class BandsintownProvider extends BaseArtistEnrichmentProvider {
    readonly id = "bandsintown";
    readonly name = "Bandsintown Concerts";
    readonly enrichmentType: "concerts";
    private appId;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    getUpcomingConcerts(artistName: string): Promise<Concert[]>;
}
export default BandsintownProvider;
//# sourceMappingURL=index.d.ts.map
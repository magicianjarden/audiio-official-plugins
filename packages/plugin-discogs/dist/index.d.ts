/**
 * Discogs Provider
 * Provides artist timeline/discography from Discogs API.
 */
import { BaseArtistEnrichmentProvider, type TimelineEntry } from '@audiio/sdk';
interface DiscogsSettings {
    apiKey: string;
    apiSecret?: string;
}
export declare class DiscogsProvider extends BaseArtistEnrichmentProvider {
    readonly id = "discogs";
    readonly name = "Discogs Timeline";
    readonly enrichmentType: "timeline";
    private apiKey;
    private apiSecret;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    updateSettings(settings: Partial<DiscogsSettings>): void;
    searchArtist(artistName: string): Promise<{
        id: string;
        name: string;
    } | null>;
    getArtistTimeline(artistName: string): Promise<TimelineEntry[]>;
    private determineReleaseType;
}
export default DiscogsProvider;
//# sourceMappingURL=index.d.ts.map
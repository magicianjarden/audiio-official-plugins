/**
 * Setlist.fm Provider
 * Provides past concert setlists from Setlist.fm API.
 */
import { BaseArtistEnrichmentProvider, type Setlist } from '@audiio/sdk';
interface SetlistFmSettings {
    apiKey: string;
}
export declare class SetlistFmProvider extends BaseArtistEnrichmentProvider {
    readonly id = "setlistfm";
    readonly name = "Setlist.fm";
    readonly enrichmentType: "setlists";
    private apiKey;
    private cache;
    private cacheTTL;
    initialize(): Promise<void>;
    updateSettings(settings: Partial<SetlistFmSettings>): void;
    searchArtist(artistName: string): Promise<{
        id: string;
        name: string;
    } | null>;
    getArtistSetlists(artistName: string, mbid?: string, limit?: number): Promise<Setlist[]>;
    private formatDate;
}
export default SetlistFmProvider;
//# sourceMappingURL=index.d.ts.map
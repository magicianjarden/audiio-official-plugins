/**
 * Deezer Metadata Provider
 * Provides track, artist, and album metadata from Deezer's public API
 * Supports configurable metadata fetching to allow complementary providers
 */
import { BaseMetadataProvider, type MetadataSearchResult, type MetadataSearchOptions, type MetadataTrack, type Artist, type Album, type ArtistDetail, type DeezerProviderSettings } from '@audiio/sdk';
export declare class DeezerMetadataProvider extends BaseMetadataProvider {
    readonly id = "deezer";
    readonly name = "Deezer";
    readonly priority = 80;
    private settings;
    /**
     * Update provider settings
     */
    updateSettings(settings: Partial<DeezerProviderSettings>): void;
    /**
     * Get current settings
     */
    getSettings(): Record<string, unknown>;
    search(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult>;
    getTrack(id: string): Promise<MetadataTrack | null>;
    getArtist(id: string): Promise<ArtistDetail | null>;
    getAlbum(id: string): Promise<(Album & {
        tracks: MetadataTrack[];
    }) | null>;
    private mapTrack;
    private mapArtist;
    private mapAlbumBasic;
    private mapAlbumWithTracks;
    private mapAlbumArtwork;
    /**
     * Get chart/trending data from Deezer
     * Uses Deezer's /chart endpoint for real trending content
     */
    getCharts(limit?: number): Promise<{
        tracks: MetadataTrack[];
        artists: Artist[];
        albums: Album[];
    }>;
    /**
     * Get circuit breaker status for monitoring
     */
    getCircuitStatus(): {
        state: "closed" | "open" | "half-open";
        failures: number;
        canRetryAt: number | null;
    };
    /**
     * Reset circuit breaker (for recovery)
     */
    resetCircuitBreaker(): void;
}
export { deezerChartsProvider, registerDeezerPipelineHooks, unregisterDeezerPipelineHooks, } from './pipeline';
export default DeezerMetadataProvider;
//# sourceMappingURL=index.d.ts.map
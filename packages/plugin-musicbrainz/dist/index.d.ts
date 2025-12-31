/**
 * MusicBrainz Metadata Provider
 * Provides track, artist, and album metadata from the free MusicBrainz database
 *
 * API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 * Rate Limit: 1 request per second (we use a queue to respect this)
 * Cover Art: Uses Cover Art Archive (https://coverartarchive.org)
 */
import { BaseMetadataProvider, type MetadataSearchResult, type MetadataSearchOptions, type MetadataTrack, type Artist, type Album, type ArtistDetail } from '@audiio/sdk';
/** Provider settings */
interface MusicBrainzProviderSettings {
    fetchArtwork: boolean;
    fetchArtistInfo: boolean;
    fetchAlbumInfo: boolean;
    fetchExternalIds: boolean;
}
export declare class MusicBrainzMetadataProvider extends BaseMetadataProvider {
    readonly id = "musicbrainz";
    readonly name = "MusicBrainz";
    readonly priority = 60;
    private settings;
    private coverArtCache;
    /**
     * Update provider settings
     */
    updateSettings(settings: Partial<MusicBrainzProviderSettings>): void;
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
    /**
     * Get popular/recent releases (MusicBrainz doesn't have charts, so we get recent releases)
     */
    getCharts(limit?: number): Promise<{
        tracks: MetadataTrack[];
        artists: Artist[];
        albums: Album[];
    }>;
    /**
     * Map MusicBrainz recording to MetadataTrack
     */
    private mapRecording;
    /**
     * Map MusicBrainz release group to Album
     */
    private mapReleaseGroup;
    /**
     * Get cover art from Cover Art Archive
     */
    private getCoverArt;
}
export default MusicBrainzMetadataProvider;
//# sourceMappingURL=index.d.ts.map
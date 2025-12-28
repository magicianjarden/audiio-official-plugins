/**
 * Apple Music Animated Artwork Provider
 * Fetches animated album artwork from Apple Music to enhance track display
 * Based on: https://github.com/Skidudeaa/Apple-Music-Animated-Artwork-Fetcher
 */
import { type AddonManifest, type BaseAddon, type ArtworkSet, type AppleMusicArtworkSettings, type HLSConversionOptions } from '@audiio/sdk';
export interface AnimatedArtwork {
    /** URL to the animated artwork video (M3U8 HLS stream) */
    videoUrl?: string;
    /** URL to static high-res artwork */
    staticUrl: string;
    /** Whether animated artwork is available */
    hasAnimated: boolean;
    /** Aspect ratio of the animated artwork */
    aspectRatio: 'tall' | 'square';
    /** Apple Music album ID */
    albumId: string;
    /** Preview frame URL if available */
    previewFrameUrl?: string;
}
export interface ConvertedArtwork extends AnimatedArtwork {
    /** Path to the converted MP4 file */
    mp4Path: string;
    /** MP4 file as a Buffer (if requested) */
    mp4Buffer?: Buffer;
    /** File size in bytes */
    fileSize: number;
    /** Conversion duration in ms */
    conversionTime: number;
}
/** Options for artwork conversion - extends core HLSConversionOptions */
export type ArtworkConversionOptions = HLSConversionOptions;
export interface ArtworkQuery {
    /** Album title */
    album: string;
    /** Artist name */
    artist: string;
    /** Track title (for more accurate matching) */
    track?: string;
}
export declare class AppleMusicArtworkProvider implements BaseAddon {
    readonly id = "applemusic-artwork";
    readonly name = "Apple Music Artwork";
    readonly priority = 90;
    private settings;
    private cachedToken;
    private tokenRefreshAttempted;
    get manifest(): AddonManifest;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    /**
     * Update provider settings
     */
    updateSettings(settings: Partial<AppleMusicArtworkSettings>): void;
    /**
     * Get current settings
     */
    getSettings(): Record<string, unknown>;
    /**
     * Search for an album and get its artwork
     */
    getArtwork(query: ArtworkQuery): Promise<AnimatedArtwork | null>;
    /**
     * Get artwork by Apple Music album ID directly
     */
    getArtworkById(albumId: string): Promise<AnimatedArtwork | null>;
    /**
     * Get a valid token, refreshing if necessary
     */
    private getToken;
    /**
     * Fetch animated artwork from Apple Music API
     */
    private fetchAnimatedArtwork;
    /**
     * Extract video asset based on settings
     */
    private extractVideoAsset;
    /**
     * Refresh the Apple Music token by fetching from the web player
     * The token is a JWT embedded in Apple's JavaScript bundles
     */
    private refreshToken;
    /**
     * Manually set the Apple Music token (useful for configuration)
     */
    setToken(token: string): void;
    /**
     * Get animated artwork and convert to MP4
     * This is the main method for backend use - handles the full pipeline
     */
    getAnimatedArtworkAsMP4(query: ArtworkQuery, options?: ArtworkConversionOptions): Promise<ConvertedArtwork | null>;
    /**
     * Get animated artwork by album ID and convert to MP4
     */
    getAnimatedArtworkByIdAsMP4(albumId: string, options?: ArtworkConversionOptions): Promise<ConvertedArtwork | null>;
    /**
     * Convert an AnimatedArtwork M3U8 stream to MP4
     * Uses core MediaProcessor for FFmpeg operations
     */
    convertToMP4(artwork: AnimatedArtwork, options?: ArtworkConversionOptions): Promise<ConvertedArtwork | null>;
    /**
     * Check if FFmpeg is available on the system
     */
    checkFFmpegAvailable(): Promise<boolean>;
    /**
     * Convert to standard ArtworkSet format
     * Includes animated artwork when available and settings allow
     */
    getArtworkSet(query: ArtworkQuery): Promise<ArtworkSet | null>;
    /**
     * Search iTunes for an album
     */
    private searchAlbum;
    /**
     * Find the best matching album from search results
     */
    private findBestMatch;
    /**
     * Resize artwork URL to specified size
     */
    private resizeArtworkUrl;
    /**
     * Normalize string for comparison
     */
    private normalizeString;
}
export default AppleMusicArtworkProvider;
//# sourceMappingURL=index.d.ts.map
/**
 * LRCLib Lyrics Provider
 * Provides synchronized lyrics from LRCLib API
 */
import { BaseLyricsProvider, type LyricsQuery, type LyricsSearchOptions, type LyricsResult, type AddonManifest } from '@audiio/sdk';
export declare class LRCLibProvider extends BaseLyricsProvider {
    readonly id = "lrclib";
    readonly name = "LRCLib";
    readonly supportsSynced = true;
    get manifest(): AddonManifest;
    getLyrics(query: LyricsQuery, _options?: LyricsSearchOptions): Promise<LyricsResult | null>;
}
export default LRCLibProvider;

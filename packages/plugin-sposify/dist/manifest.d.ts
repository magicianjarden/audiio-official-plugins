/**
 * Sposify Plugin Manifest
 * Defines plugin capabilities, settings, and metadata
 */
export interface SposifyManifest {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    category: 'metadata' | 'import' | 'analysis';
    icon: string;
    capabilities: SposifyCapabilities;
    settings: SposifySetting[];
    privacyAccess: PrivacyAccess[];
}
export interface SposifyCapabilities {
    spotifyImport: boolean;
    audioFeatures: boolean;
    isrcMatching: boolean;
    playlistDiscovery: boolean;
    metadataEnrichment: boolean;
}
export interface SposifySetting {
    key: string;
    label: string;
    description: string;
    type: 'boolean' | 'string' | 'number' | 'select';
    default: boolean | string | number;
    options?: {
        value: string;
        label: string;
    }[];
    category: string;
}
export interface PrivacyAccess {
    type: string;
    description: string;
    required: boolean;
}
export declare const SPOSIFY_MANIFEST: SposifyManifest;
export default SPOSIFY_MANIFEST;
//# sourceMappingURL=manifest.d.ts.map
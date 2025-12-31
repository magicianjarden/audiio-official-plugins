import { MetadataServiceProvider } from './provider.js';
import { MetadataServiceLyricsProvider } from './lyrics-provider.js';
import type { AddonManifest, PluginContext } from '@audiio/core';

export const manifest: AddonManifest = {
  id: 'metadata-service',
  name: 'Audiio Metadata Service',
  version: '1.0.0',
  description: 'Connects to the Audiio metadata aggregation service for comprehensive track, artist, and lyrics data',
  roles: ['metadata-provider', 'lyrics-provider'],
  author: 'Audiio',
  settings: {
    serviceUrl: {
      type: 'string',
      label: 'Service URL',
      description: 'URL of the metadata service (e.g., https://audiio-metadata.fly.dev)',
      default: 'https://audiio-metadata.fly.dev',
      required: true,
    },
    cacheEnabled: {
      type: 'boolean',
      label: 'Enable Local Cache',
      description: 'Cache responses locally for faster repeated lookups',
      default: true,
    },
    cacheTTL: {
      type: 'number',
      label: 'Cache TTL (seconds)',
      description: 'How long to keep cached responses',
      default: 3600,
    },
  },
};

let metadataProvider: MetadataServiceProvider | null = null;
let lyricsProvider: MetadataServiceLyricsProvider | null = null;

export async function activate(context: PluginContext): Promise<void> {
  const settings = context.settings || {};
  const serviceUrl = (settings.serviceUrl as string) || 'https://audiio-metadata.fly.dev';
  const cacheEnabled = settings.cacheEnabled !== false;
  const cacheTTL = (settings.cacheTTL as number) || 3600;

  // Create providers
  metadataProvider = new MetadataServiceProvider({
    serviceUrl,
    cacheEnabled,
    cacheTTL,
  });

  lyricsProvider = new MetadataServiceLyricsProvider({
    serviceUrl,
    cacheEnabled,
    cacheTTL,
  });

  // Initialize providers
  await metadataProvider.initialize();
  await lyricsProvider.initialize();

  // Register providers
  context.registerMetadataProvider(metadataProvider);
  context.registerLyricsProvider(lyricsProvider);
}

export async function deactivate(): Promise<void> {
  if (metadataProvider) {
    await metadataProvider.dispose();
    metadataProvider = null;
  }

  if (lyricsProvider) {
    await lyricsProvider.dispose();
    lyricsProvider = null;
  }
}

export { MetadataServiceProvider } from './provider.js';
export { MetadataServiceLyricsProvider } from './lyrics-provider.js';

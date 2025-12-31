/**
 * @audiio/plugin-audiiodb
 *
 * Open-source music metadata provider for Audiio
 *
 * AudiioDB provides access to:
 * - 256M tracks with metadata and audio analysis
 * - 10M artists with discographies
 * - 20M albums with cover art
 * - Sub-50ms search powered by Meilisearch
 *
 * Data sourced from Anna's Archive Spotify dataset.
 * Self-hostable, open-source, and free to use.
 *
 * @see https://audiiodb.com
 */

// Main provider export
export {
  AudiioDBMetadataProvider,
  audiioDBClient,
  type AudiioDBProviderSettings,
} from './audiiodb-provider';

// API client exports
export {
  AudiioDBClient,
  type AudiioDBTrack,
  type AudiioDBArtist,
  type AudiioDBAlbum,
  type AudiioDBSearchResult,
  type AudiioDBCharts,
  type AudiioDBSearchFilters,
  type AudiioDBClientOptions,
} from './api-client';

// Pipeline exports for Discover integration
export {
  audiioDBChartsProvider,
  setAudiioDBProvider,
} from './pipeline/charts-provider';

// Re-export the provider as default for addon loading
import { AudiioDBMetadataProvider } from './audiiodb-provider';
export default AudiioDBMetadataProvider;

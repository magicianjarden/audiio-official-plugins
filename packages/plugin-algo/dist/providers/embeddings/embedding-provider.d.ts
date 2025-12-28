/**
 * Embedding Provider - Track embeddings for similarity search
 *
 * Uses a small neural network to generate embedding vectors for tracks.
 */
import type { Track, AggregatedFeatures, MLCoreEndpoints } from '@audiio/ml-sdk';
export declare class EmbeddingProvider {
    private model;
    private endpoints;
    private embeddingIndex;
    private cache;
    constructor();
    /**
     * Initialize the embedding provider
     */
    initialize(endpoints: MLCoreEndpoints): Promise<void>;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Get embedding for a track
     */
    getEmbedding(trackId: string): Promise<number[] | null>;
    /**
     * Generate embedding from features
     */
    generateEmbedding(features: AggregatedFeatures): Promise<number[] | null>;
    /**
     * Find similar tracks by embedding
     */
    findSimilar(trackId: string, limit: number): Promise<string[]>;
    /**
     * Search by embedding similarity
     */
    searchByEmbedding(embedding: number[], limit: number, excludeId?: string): string[];
    /**
     * Index track embeddings
     */
    indexTracks(tracks: Track[]): Promise<void>;
    /**
     * Create embedding model
     */
    private createModel;
    /**
     * Calculate cosine similarity
     */
    private cosineSimilarity;
}
//# sourceMappingURL=embedding-provider.d.ts.map
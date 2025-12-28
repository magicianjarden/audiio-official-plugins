"use strict";
/**
 * Audiio Algorithm - Official recommendation algorithm
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudiioAlgorithm = void 0;
const ml_sdk_1 = require("@audiio/ml-sdk");
const manifest_1 = require("../manifest");
const hybrid_scorer_1 = require("../scoring/hybrid-scorer");
const neural_scorer_1 = require("../scoring/neural-scorer");
const trainer_1 = require("../training/trainer");
const radio_generator_1 = require("./radio-generator");
class AudiioAlgorithm extends ml_sdk_1.BaseAlgorithm {
    constructor() {
        super(...arguments);
        this.manifest = manifest_1.AUDIIO_ALGO_MANIFEST;
        // Feature providers exposed to core
        this.featureProviders = [];
    }
    // ============================================================================
    // Lifecycle
    // ============================================================================
    async onInitialize() {
        this.log('Initializing Audiio Algorithm...');
        // Initialize neural scorer
        this.neuralScorer = new neural_scorer_1.NeuralScorer();
        await this.neuralScorer.initialize(this.endpoints);
        // Initialize hybrid scorer
        this.hybridScorer = new hybrid_scorer_1.HybridScorer(this.endpoints, this.neuralScorer, this.settings);
        // Initialize trainer
        this.trainer = new trainer_1.Trainer(this.endpoints, this.neuralScorer);
        // Initialize radio generator
        this.radioGenerator = new radio_generator_1.RadioGenerator(this.endpoints, this.hybridScorer);
        // Initialize providers based on settings
        await this.initializeProviders();
        // Register feature providers with core
        this.registerProviders();
        // Check if training needed
        if (this.getSetting('autoTrain', true)) {
            const needsTraining = await this.needsTraining?.() ?? false;
            if (needsTraining) {
                this.log('Training needed, scheduling...');
                // Train async, don't block initialization
                this.trainAsync();
            }
        }
        this.log('Initialized successfully');
    }
    async onDispose() {
        this.log('Disposing...');
        // Unregister providers
        for (const provider of this.featureProviders) {
            this.endpoints.features.unregister(provider.id);
        }
        // Dispose providers
        await this.essentiaProvider?.dispose?.();
        await this.emotionProvider?.dispose?.();
        await this.lyricsProvider?.dispose?.();
        await this.fingerprintProvider?.dispose?.();
        await this.embeddingProvider?.dispose?.();
        // Dispose components
        await this.neuralScorer.dispose();
        this.log('Disposed');
    }
    // ============================================================================
    // Provider Initialization
    // ============================================================================
    async initializeProviders() {
        // Essentia - Audio analysis
        if (this.getSetting('enableAudioAnalysis', true)) {
            try {
                const { EssentiaProvider } = await Promise.resolve().then(() => __importStar(require('../providers/essentia/essentia-provider')));
                this.essentiaProvider = new EssentiaProvider(this.getSetting('audioAnalysisQuality', 'balanced'));
                await this.essentiaProvider.initialize();
                this.log('Essentia provider initialized');
            }
            catch (error) {
                this.warn('Failed to initialize Essentia provider:', error);
            }
        }
        // Emotion detection
        if (this.getSetting('enableEmotionDetection', true)) {
            try {
                const { EmotionProvider } = await Promise.resolve().then(() => __importStar(require('../providers/emotion/emotion-provider')));
                this.emotionProvider = new EmotionProvider();
                await this.emotionProvider.initialize(this.endpoints);
                this.log('Emotion provider initialized');
            }
            catch (error) {
                this.warn('Failed to initialize Emotion provider:', error);
            }
        }
        // Lyrics analysis
        if (this.getSetting('enableLyricsAnalysis', true)) {
            try {
                const { LyricsProvider } = await Promise.resolve().then(() => __importStar(require('../providers/lyrics/lyrics-provider')));
                this.lyricsProvider = new LyricsProvider();
                await this.lyricsProvider.initialize(this.endpoints);
                this.log('Lyrics provider initialized');
            }
            catch (error) {
                this.warn('Failed to initialize Lyrics provider:', error);
            }
        }
        // Embeddings
        if (this.getSetting('enableEmbeddings', true)) {
            try {
                const { EmbeddingProvider } = await Promise.resolve().then(() => __importStar(require('../providers/embeddings/embedding-provider')));
                this.embeddingProvider = new EmbeddingProvider();
                await this.embeddingProvider.initialize(this.endpoints);
                this.log('Embedding provider initialized');
            }
            catch (error) {
                this.warn('Failed to initialize Embedding provider:', error);
            }
        }
        // Fingerprinting (lazy - only load when needed)
        // Will be loaded on first fingerprinting request
    }
    registerProviders() {
        // Essentia audio features
        if (this.essentiaProvider) {
            this.featureProviders.push({
                id: 'audiio-algo:essentia',
                priority: 100,
                capabilities: {
                    audioAnalysis: true,
                    emotionDetection: false,
                    lyricsAnalysis: false,
                    similarity: false,
                    fingerprinting: false,
                    embeddings: false,
                    canAnalyzeUrl: false,
                    canAnalyzeFile: true,
                    canAnalyzeBuffer: true,
                    supportsRealtime: false,
                    requiresWasm: true,
                },
                getAudioFeatures: async (trackId) => {
                    return this.essentiaProvider?.getAudioFeatures(trackId) ?? null;
                },
                analyzeAudioBuffer: async (buffer, sampleRate) => {
                    return this.essentiaProvider?.analyzeBuffer(buffer, sampleRate) ?? null;
                },
            });
        }
        // Emotion features
        if (this.emotionProvider) {
            this.featureProviders.push({
                id: 'audiio-algo:emotion',
                priority: 100,
                capabilities: {
                    audioAnalysis: false,
                    emotionDetection: true,
                    lyricsAnalysis: false,
                    similarity: false,
                    fingerprinting: false,
                    embeddings: false,
                    canAnalyzeUrl: false,
                    canAnalyzeFile: false,
                    canAnalyzeBuffer: true,
                    supportsRealtime: false,
                    requiresWasm: false,
                },
                getEmotionFeatures: async (trackId) => {
                    return this.emotionProvider?.getEmotionFeatures(trackId) ?? null;
                },
            });
        }
        // Lyrics features
        if (this.lyricsProvider) {
            this.featureProviders.push({
                id: 'audiio-algo:lyrics',
                priority: 100,
                capabilities: {
                    audioAnalysis: false,
                    emotionDetection: false,
                    lyricsAnalysis: true,
                    similarity: false,
                    fingerprinting: false,
                    embeddings: false,
                    canAnalyzeUrl: false,
                    canAnalyzeFile: false,
                    canAnalyzeBuffer: false,
                    supportsRealtime: false,
                    requiresWasm: false,
                },
                getLyricsFeatures: async (trackId) => {
                    return this.lyricsProvider?.getLyricsFeatures(trackId) ?? null;
                },
                analyzeLyrics: async (lyrics) => {
                    return this.lyricsProvider?.analyzeLyrics(lyrics) ?? null;
                },
            });
        }
        // Embeddings
        if (this.embeddingProvider) {
            this.featureProviders.push({
                id: 'audiio-algo:embeddings',
                priority: 100,
                capabilities: {
                    audioAnalysis: false,
                    emotionDetection: false,
                    lyricsAnalysis: false,
                    similarity: true,
                    fingerprinting: false,
                    embeddings: true,
                    canAnalyzeUrl: false,
                    canAnalyzeFile: false,
                    canAnalyzeBuffer: false,
                    supportsRealtime: false,
                    requiresWasm: false,
                },
                getEmbedding: async (trackId) => {
                    return this.embeddingProvider?.getEmbedding(trackId) ?? null;
                },
                getSimilarTracks: async (trackId, limit) => {
                    return this.embeddingProvider?.findSimilar(trackId, limit) ?? [];
                },
            });
        }
        // Register all providers with core
        for (const provider of this.featureProviders) {
            this.endpoints.features.register(provider);
        }
    }
    // ============================================================================
    // Scoring
    // ============================================================================
    async scoreTrack(track, features, context) {
        return this.hybridScorer.score(track, features, context);
    }
    async scoreBatch(tracks, context) {
        return this.hybridScorer.scoreBatch(tracks, context);
    }
    async rankCandidates(candidates, context) {
        const scores = await this.scoreBatch(candidates, context);
        return scores
            .map((score, index) => ({
            ...candidates[index],
            score: {
                trackId: score.trackId,
                finalScore: score.finalScore,
                confidence: score.confidence,
                components: score.components,
                explanation: score.explanation,
            },
        }))
            .sort((a, b) => b.score.finalScore - a.score.finalScore);
    }
    // ============================================================================
    // Training
    // ============================================================================
    async train(data) {
        return this.trainer.train(data);
    }
    getTrainingStatus() {
        return this.trainer.getStatus();
    }
    async needsTraining() {
        const newEvents = await this.endpoints.training.getNewEventCount();
        const lastInfo = await this.endpoints.training.getLastTrainingInfo();
        if (!lastInfo) {
            return newEvents >= 50;
        }
        const daysSinceTraining = (Date.now() - lastInfo.timestamp) / (24 * 60 * 60 * 1000);
        return newEvents >= 10 || daysSinceTraining >= 7;
    }
    async trainAsync() {
        try {
            const dataset = await this.endpoints.training.getFullDataset();
            await this.train(dataset);
        }
        catch (error) {
            this.error('Async training failed:', error);
        }
    }
    // ============================================================================
    // Radio
    // ============================================================================
    async generateRadio(seed, count, context) {
        return this.radioGenerator.generate(seed, count, context);
    }
    // ============================================================================
    // Similarity
    // ============================================================================
    async findSimilar(trackId, limit) {
        if (!this.embeddingProvider) {
            return [];
        }
        const similarIds = await this.embeddingProvider.findSimilar(trackId, limit);
        const tracks = [];
        for (let i = 0; i < similarIds.length; i++) {
            const track = await this.endpoints.library.getTrack(similarIds[i]);
            if (track) {
                tracks.push({
                    ...track,
                    score: {
                        trackId: track.id,
                        finalScore: 100 - i * 5, // Decreasing score by position
                        confidence: 0.8,
                        components: {},
                        explanation: ['Similar to selected track'],
                    },
                });
            }
        }
        return tracks;
    }
    // ============================================================================
    // Events
    // ============================================================================
    async onUserEvent(event) {
        // Update scorer's real-time state
        this.hybridScorer.handleEvent(event);
        // Clear relevant caches
        if ('track' in event) {
            this.invalidateCache(event.track.id);
        }
    }
    // ============================================================================
    // Fingerprinting (On Demand)
    // ============================================================================
    async ensureFingerprintProvider() {
        if (this.fingerprintProvider) {
            return this.fingerprintProvider;
        }
        if (!this.getSetting('enableFingerprinting', true)) {
            return null;
        }
        try {
            const { FingerprintProvider } = await Promise.resolve().then(() => __importStar(require('../providers/fingerprint/fingerprint-provider')));
            this.fingerprintProvider = new FingerprintProvider();
            await this.fingerprintProvider.initialize(this.endpoints);
            this.log('Fingerprint provider initialized on demand');
            return this.fingerprintProvider;
        }
        catch (error) {
            this.warn('Failed to initialize Fingerprint provider:', error);
            return null;
        }
    }
    async indexLibrary(tracks) {
        const provider = await this.ensureFingerprintProvider();
        if (!provider) {
            throw new Error('Fingerprinting not available');
        }
        await provider.indexTracks(tracks);
    }
    async findDuplicates() {
        const provider = await this.ensureFingerprintProvider();
        if (!provider) {
            return [];
        }
        return provider.findDuplicates();
    }
    async identifyTrack(audioPath) {
        const provider = await this.ensureFingerprintProvider();
        if (!provider) {
            return [];
        }
        return provider.identify(audioPath);
    }
    // ============================================================================
    // Explanation
    // ============================================================================
    async explainScore(trackId) {
        return this.hybridScorer.explain(trackId);
    }
}
exports.AudiioAlgorithm = AudiioAlgorithm;
//# sourceMappingURL=audiio-algorithm.js.map
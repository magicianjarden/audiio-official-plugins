"use strict";
/**
 * Essentia Provider - Real-time audio analysis using Essentia.js
 *
 * Uses WebAssembly for in-browser audio feature extraction.
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
exports.EssentiaProvider = void 0;
const ml_sdk_1 = require("@audiio/ml-sdk");
class EssentiaProvider {
    constructor(quality = 'balanced') {
        this.essentia = null;
        this.isLoading = false;
        this.loadPromise = null;
        this.quality = quality;
        this.cache = new ml_sdk_1.MemoryCache(1000, 3600000); // 1 hour cache
    }
    /**
     * Initialize the Essentia WASM module
     */
    async initialize() {
        if (this.essentia)
            return;
        if (this.loadPromise)
            return this.loadPromise;
        this.isLoading = true;
        this.loadPromise = this.loadEssentia();
        await this.loadPromise;
        this.isLoading = false;
    }
    /**
     * Load Essentia.js WASM
     */
    async loadEssentia() {
        try {
            // Dynamic import of essentia.js
            const essentiaModule = await Promise.resolve().then(() => __importStar(require('essentia.js')));
            // Initialize WASM - the default export is a Promise that resolves to a constructor
            const EssentiaWASM = await essentiaModule.default;
            this.essentia = new EssentiaWASM();
            console.log('[EssentiaProvider] WASM loaded successfully');
        }
        catch (error) {
            console.error('[EssentiaProvider] Failed to load WASM:', error);
            throw error;
        }
    }
    /**
     * Dispose resources
     */
    async dispose() {
        this.essentia = null;
        this.cache.clear();
    }
    /**
     * Get audio features for a track (by ID)
     */
    async getAudioFeatures(trackId) {
        // Check cache
        const cached = this.cache.get(trackId);
        if (cached)
            return cached;
        // Features need to be analyzed from audio buffer
        // This will be called by the audio player when track plays
        return null;
    }
    /**
     * Analyze audio buffer
     */
    async analyzeBuffer(buffer, sampleRate) {
        if (!this.essentia) {
            await this.initialize();
        }
        if (!this.essentia) {
            console.error('[EssentiaProvider] Essentia not loaded');
            return null;
        }
        try {
            // Convert to Float32Array
            const audioData = new Float32Array(buffer);
            // Resample if needed (Essentia expects 44100 Hz)
            const targetSampleRate = 44100;
            const resampled = sampleRate === targetSampleRate
                ? audioData
                : this.resample(audioData, sampleRate, targetSampleRate);
            // Convert to Essentia vector
            const signal = this.essentia.arrayToVector(resampled);
            // Extract features based on quality level
            const features = await this.extractFeatures(signal, resampled);
            return features;
        }
        catch (error) {
            console.error('[EssentiaProvider] Analysis failed:', error);
            return null;
        }
    }
    /**
     * Extract features from signal
     */
    async extractFeatures(signal, audioData) {
        const features = {};
        try {
            // === BPM / Rhythm ===
            const rhythm = this.essentia.RhythmExtractor(signal);
            features.bpm = rhythm.bpm;
            features.beatStrength = rhythm.confidence;
            // === Key Detection ===
            const key = this.essentia.KeyExtractor(signal);
            features.key = this.normalizeKey(key.key);
            features.mode = key.scale.toLowerCase();
            // === Energy & Loudness ===
            const loudness = this.essentia.Loudness(signal);
            features.loudness = loudness.loudness;
            const energy = this.essentia.Energy(signal);
            features.energy = this.normalizeEnergy(energy.energy);
            // === Danceability ===
            if (this.quality !== 'fast') {
                const danceability = this.essentia.Danceability(signal);
                features.danceability = danceability.danceability;
            }
            // === Spectral Features ===
            if (this.quality === 'accurate') {
                const spectral = this.essentia.SpectralCentroidTime(signal);
                features.spectralCentroid = spectral.spectralCentroid;
                const zcr = this.essentia.ZeroCrossingRate(signal);
                features.zeroCrossingRate = zcr.zeroCrossingRate;
                // MFCC for ML models
                const mfcc = this.essentia.MFCC(signal, { numberCoefficients: 13 });
                features.mfcc = Array.from(mfcc.mfcc[0]);
            }
            // === Derived Features ===
            // Estimate valence from spectral and energy features
            features.valence = this.estimateValence(features);
            // Estimate acousticness
            features.acousticness = this.estimateAcousticness(features);
            // Estimate instrumentalness (requires speechiness estimate)
            const speechEstimate = this.estimateSpeechiness(audioData);
            features.speechiness = speechEstimate;
            features.instrumentalness = 1 - speechEstimate;
            features.analysisConfidence = 0.8;
        }
        catch (error) {
            console.error('[EssentiaProvider] Feature extraction error:', error);
        }
        return features;
    }
    /**
     * Normalize key to standard format
     */
    normalizeKey(key) {
        const keyMap = {
            'C': 'C', 'C#': 'C#', 'Db': 'Db', 'D': 'D', 'D#': 'D#', 'Eb': 'Eb',
            'E': 'E', 'F': 'F', 'F#': 'F#', 'Gb': 'Gb', 'G': 'G', 'G#': 'G#',
            'Ab': 'Ab', 'A': 'A', 'A#': 'A#', 'Bb': 'Bb', 'B': 'B',
        };
        return keyMap[key] || 'C';
    }
    /**
     * Normalize energy to 0-1 range
     */
    normalizeEnergy(energy) {
        // Energy values from Essentia can vary widely
        // Normalize using sigmoid-like function
        const normalized = 2 / (1 + Math.exp(-energy / 1000)) - 1;
        return Math.max(0, Math.min(1, normalized));
    }
    /**
     * Estimate valence from other features
     */
    estimateValence(features) {
        // Higher energy and brighter tones suggest higher valence
        const energyContribution = (features.energy ?? 0.5) * 0.4;
        const modeContribution = features.mode === 'major' ? 0.3 : 0.15;
        const brightnessContribution = features.spectralCentroid
            ? Math.min(1, features.spectralCentroid / 5000) * 0.3
            : 0.25;
        return energyContribution + modeContribution + brightnessContribution;
    }
    /**
     * Estimate acousticness
     */
    estimateAcousticness(features) {
        // Lower spectral centroid and less dynamic range suggest acoustic
        const spectralFactor = features.spectralCentroid
            ? 1 - Math.min(1, features.spectralCentroid / 4000)
            : 0.5;
        return spectralFactor;
    }
    /**
     * Estimate speechiness from audio
     */
    estimateSpeechiness(audioData) {
        // Simple ZCR-based estimate
        let zeroCrossings = 0;
        for (let i = 1; i < audioData.length; i++) {
            if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
                zeroCrossings++;
            }
        }
        const zcr = zeroCrossings / audioData.length;
        // Speech typically has higher ZCR than music
        // Normalize to 0-1
        return Math.min(1, zcr * 10);
    }
    /**
     * Resample audio data
     */
    resample(audioData, fromRate, toRate) {
        const ratio = fromRate / toRate;
        const newLength = Math.floor(audioData.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
            const frac = srcIndex - srcIndexFloor;
            result[i] = audioData[srcIndexFloor] * (1 - frac) + audioData[srcIndexCeil] * frac;
        }
        return result;
    }
    /**
     * Cache features for a track
     */
    cacheFeatures(trackId, features) {
        this.cache.set(trackId, features);
    }
}
exports.EssentiaProvider = EssentiaProvider;
//# sourceMappingURL=essentia-provider.js.map
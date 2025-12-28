"use strict";
/**
 * Lyrics Provider - Lyrics sentiment and theme analysis
 *
 * Uses a small transformer model for sentiment and keyword extraction.
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
exports.LyricsProvider = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
const ml_sdk_1 = require("@audiio/ml-sdk");
const MODEL_KEY = 'lyrics-model';
const MAX_TOKENS = 128;
const VOCAB_SIZE = 10000;
// Simple word-to-sentiment mapping for fallback
const POSITIVE_WORDS = new Set([
    'love', 'happy', 'joy', 'beautiful', 'wonderful', 'amazing', 'great',
    'good', 'best', 'dream', 'hope', 'smile', 'laugh', 'dance', 'sun',
    'light', 'bright', 'warm', 'sweet', 'gentle', 'kind', 'free', 'alive',
]);
const NEGATIVE_WORDS = new Set([
    'hate', 'sad', 'pain', 'hurt', 'cry', 'tear', 'dark', 'cold',
    'alone', 'lonely', 'lost', 'break', 'broken', 'fall', 'die', 'dead',
    'fear', 'angry', 'rage', 'storm', 'night', 'shadow', 'never', 'gone',
]);
const THEME_KEYWORDS = {
    love: ['love', 'heart', 'kiss', 'hold', 'touch', 'forever', 'baby', 'darling'],
    heartbreak: ['break', 'broken', 'gone', 'leave', 'left', 'goodbye', 'over', 'end'],
    party: ['dance', 'party', 'night', 'club', 'move', 'beat', 'fun', 'crazy'],
    nostalgia: ['remember', 'memory', 'yesterday', 'time', 'old', 'back', 'used'],
    empowerment: ['strong', 'power', 'rise', 'fight', 'stand', 'never', 'give', 'up'],
    nature: ['sun', 'moon', 'star', 'sky', 'sea', 'ocean', 'wind', 'rain', 'flower'],
    spirituality: ['soul', 'spirit', 'god', 'heaven', 'faith', 'believe', 'pray'],
    rebellion: ['rebel', 'fight', 'free', 'break', 'rule', 'against', 'revolution'],
};
class LyricsProvider {
    constructor() {
        this.model = null;
        this.vocabulary = new Map();
        this.cache = new ml_sdk_1.MemoryCache(1000, 3600000);
        this.buildVocabulary();
    }
    /**
     * Initialize the lyrics model
     */
    async initialize(endpoints) {
        this.endpoints = endpoints;
        // Try to load existing model
        const modelStorage = endpoints.storage.getModelStorage();
        const existingModel = await modelStorage.load(MODEL_KEY);
        if (existingModel) {
            this.model = existingModel;
            console.log('[LyricsProvider] Loaded existing model');
        }
        else {
            // Create default model
            this.model = this.createModel();
            console.log('[LyricsProvider] Created new model');
        }
    }
    /**
     * Dispose resources
     */
    async dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.cache.clear();
    }
    /**
     * Get lyrics features for a track
     */
    async getLyricsFeatures(trackId) {
        // Check cache
        const cached = this.cache.get(trackId);
        if (cached)
            return cached;
        // Would need lyrics from an external source
        return null;
    }
    /**
     * Analyze lyrics text
     */
    async analyzeLyrics(lyrics) {
        // Tokenize and clean
        const tokens = this.tokenize(lyrics);
        // Get sentiment from model or fallback
        let sentiment;
        let confidence;
        if (this.model && tokens.length >= 10) {
            const result = await this.predictSentiment(tokens);
            sentiment = result.sentiment;
            confidence = result.confidence;
        }
        else {
            const result = this.fallbackSentiment(tokens);
            sentiment = result.sentiment;
            confidence = result.confidence;
        }
        // Detect themes
        const themes = this.detectThemes(tokens);
        // Calculate emotional intensity
        const intensity = this.calculateIntensity(tokens);
        // Detect language (simplified)
        const language = this.detectLanguage(lyrics);
        return {
            sentiment,
            sentimentConfidence: confidence,
            themes,
            emotionalIntensity: intensity,
            language,
            lyrics,
        };
    }
    /**
     * Create sentiment model
     */
    createModel() {
        const model = tf.sequential();
        // Embedding layer
        model.add(tf.layers.embedding({
            inputDim: VOCAB_SIZE,
            outputDim: 64,
            inputLength: MAX_TOKENS,
        }));
        // LSTM layer
        model.add(tf.layers.lstm({
            units: 64,
            returnSequences: false,
        }));
        // Dense layers
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dropout({ rate: 0.3 }));
        // Output: sentiment (-1 to 1)
        model.add(tf.layers.dense({ units: 1, activation: 'tanh' }));
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
        });
        return model;
    }
    /**
     * Predict sentiment using model
     */
    async predictSentiment(tokens) {
        try {
            // Convert tokens to indices
            const indices = tokens.slice(0, MAX_TOKENS).map(t => this.vocabulary.get(t.toLowerCase()) ?? 0);
            // Pad to MAX_TOKENS
            while (indices.length < MAX_TOKENS) {
                indices.push(0);
            }
            // Predict
            const inputTensor = tf.tensor2d([indices], [1, MAX_TOKENS]);
            const prediction = this.model.predict(inputTensor);
            const sentiment = (await prediction.data())[0];
            // Cleanup
            inputTensor.dispose();
            prediction.dispose();
            return { sentiment, confidence: 0.7 };
        }
        catch (error) {
            console.error('[LyricsProvider] Model prediction failed:', error);
            return this.fallbackSentiment(tokens);
        }
    }
    /**
     * Fallback sentiment analysis using word lists
     */
    fallbackSentiment(tokens) {
        let positiveCount = 0;
        let negativeCount = 0;
        for (const token of tokens) {
            const lower = token.toLowerCase();
            if (POSITIVE_WORDS.has(lower))
                positiveCount++;
            if (NEGATIVE_WORDS.has(lower))
                negativeCount++;
        }
        const total = positiveCount + negativeCount;
        if (total === 0) {
            return { sentiment: 0, confidence: 0.3 };
        }
        const sentiment = (positiveCount - negativeCount) / total;
        const confidence = Math.min(0.6, total / 20);
        return { sentiment, confidence };
    }
    /**
     * Detect themes in lyrics
     */
    detectThemes(tokens) {
        const themeCounts = {};
        const lowerTokens = new Set(tokens.map(t => t.toLowerCase()));
        for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
            let count = 0;
            for (const keyword of keywords) {
                if (lowerTokens.has(keyword)) {
                    count++;
                }
            }
            if (count > 0) {
                themeCounts[theme] = count / keywords.length;
            }
        }
        // Sort by confidence and return top themes
        return Object.entries(themeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([theme, confidence]) => ({
            theme,
            confidence: Math.min(1, confidence * 2),
        }));
    }
    /**
     * Calculate emotional intensity
     */
    calculateIntensity(tokens) {
        // Count exclamation marks, capital words, repetition
        let intensity = 0;
        const seen = new Set();
        let repeats = 0;
        for (const token of tokens) {
            if (token.endsWith('!'))
                intensity += 0.1;
            if (token === token.toUpperCase() && token.length > 2)
                intensity += 0.05;
            const lower = token.toLowerCase();
            if (seen.has(lower)) {
                repeats++;
            }
            else {
                seen.add(lower);
            }
        }
        // Repetition can indicate intensity
        intensity += (repeats / tokens.length) * 0.3;
        // Sentiment words add intensity
        for (const token of tokens) {
            const lower = token.toLowerCase();
            if (POSITIVE_WORDS.has(lower) || NEGATIVE_WORDS.has(lower)) {
                intensity += 0.05;
            }
        }
        return Math.min(1, intensity);
    }
    /**
     * Detect language (simplified)
     */
    detectLanguage(text) {
        // Very simple language detection
        const englishWords = ['the', 'and', 'is', 'of', 'to', 'a', 'in', 'for', 'you', 'i'];
        const spanishWords = ['el', 'la', 'de', 'en', 'y', 'que', 'es', 'un', 'una'];
        const lower = text.toLowerCase();
        let englishCount = 0;
        let spanishCount = 0;
        for (const word of englishWords) {
            if (lower.includes(` ${word} `))
                englishCount++;
        }
        for (const word of spanishWords) {
            if (lower.includes(` ${word} `))
                spanishCount++;
        }
        if (spanishCount > englishCount)
            return 'es';
        return 'en';
    }
    /**
     * Tokenize lyrics
     */
    tokenize(lyrics) {
        return lyrics
            .replace(/[^\w\s!?']/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }
    /**
     * Build basic vocabulary
     */
    buildVocabulary() {
        // Add common words
        const commonWords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
            'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours',
        ];
        let idx = 1; // 0 is reserved for unknown/padding
        for (const word of commonWords) {
            this.vocabulary.set(word, idx++);
        }
        // Add sentiment words
        for (const word of POSITIVE_WORDS) {
            if (!this.vocabulary.has(word)) {
                this.vocabulary.set(word, idx++);
            }
        }
        for (const word of NEGATIVE_WORDS) {
            if (!this.vocabulary.has(word)) {
                this.vocabulary.set(word, idx++);
            }
        }
        // Add theme words
        for (const keywords of Object.values(THEME_KEYWORDS)) {
            for (const word of keywords) {
                if (!this.vocabulary.has(word)) {
                    this.vocabulary.set(word, idx++);
                }
            }
        }
    }
    /**
     * Cache features for a track
     */
    cacheFeatures(trackId, features) {
        this.cache.set(trackId, features);
    }
}
exports.LyricsProvider = LyricsProvider;
//# sourceMappingURL=lyrics-provider.js.map
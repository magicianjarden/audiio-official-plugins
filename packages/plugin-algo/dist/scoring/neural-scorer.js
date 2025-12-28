"use strict";
/**
 * Neural Scorer - TensorFlow.js neural network for preference prediction
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
exports.NeuralScorer = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
const ml_sdk_1 = require("@audiio/ml-sdk");
const MODEL_KEY = 'recommendation-model';
class NeuralScorer {
    constructor() {
        this.model = null;
        this.modelVersion = 0;
        this.isTraining = false;
        this.lastTrainingLoss = 0;
        this.lastTrainingAccuracy = 0;
    }
    /**
     * Initialize the neural scorer
     */
    async initialize(endpoints) {
        this.endpoints = endpoints;
        // Try to load existing model
        const modelStorage = endpoints.storage.getModelStorage();
        const existingModel = await modelStorage.load(MODEL_KEY);
        if (existingModel) {
            this.model = existingModel;
            console.log('[NeuralScorer] Loaded existing model');
            // Load metadata
            const metadata = await endpoints.storage.get('model-metadata');
            if (metadata) {
                this.modelVersion = metadata.version;
                this.lastTrainingLoss = metadata.loss;
                this.lastTrainingAccuracy = metadata.accuracy;
            }
        }
        else {
            // Create new model
            const inputDim = (0, ml_sdk_1.getFeatureVectorDimension)();
            this.model = (0, ml_sdk_1.createRecommendationModel)(inputDim);
            (0, ml_sdk_1.compileForBinaryClassification)(this.model);
            console.log('[NeuralScorer] Created new model');
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
    }
    /**
     * Predict preference score for feature vectors
     */
    async predict(features) {
        if (!this.model) {
            return features.map(() => 0.5);
        }
        const flatFeatures = features.map(f => (0, ml_sdk_1.flattenFeatureVector)(f));
        return (0, ml_sdk_1.predictBatch)(this.model, flatFeatures);
    }
    /**
     * Predict single feature vector
     */
    async predictSingle(features) {
        const scores = await this.predict([features]);
        return scores[0];
    }
    /**
     * Train the model on a dataset
     */
    async train(dataset) {
        if (!this.model) {
            return {
                success: false,
                error: 'Model not initialized',
                metrics: this.getEmptyMetrics(),
                model: this.getModelInfo(),
                duration: 0,
                completedAt: Date.now(),
            };
        }
        if (this.isTraining) {
            return {
                success: false,
                error: 'Training already in progress',
                metrics: this.getEmptyMetrics(),
                model: this.getModelInfo(),
                duration: 0,
                completedAt: Date.now(),
            };
        }
        this.isTraining = true;
        const startTime = Date.now();
        try {
            // Prepare training data
            const { features, labels } = this.prepareTrainingData(dataset);
            if (features.length < 50) {
                return {
                    success: false,
                    error: 'Not enough training data (need at least 50 samples)',
                    metrics: this.getEmptyMetrics(),
                    model: this.getModelInfo(),
                    duration: Date.now() - startTime,
                    completedAt: Date.now(),
                };
            }
            // Calculate class weights for imbalanced data
            const classWeights = (0, ml_sdk_1.calculateClassWeights)(labels);
            // Convert to tensors
            const xTensor = tf.tensor2d(features);
            const yTensor = tf.tensor1d(labels);
            // Train
            const metrics = await (0, ml_sdk_1.trainModel)(this.model, xTensor, yTensor, {
                epochs: 50,
                batchSize: 32,
                validationSplit: 0.2,
                classWeight: classWeights,
                shuffle: true,
                verbose: 0,
            });
            // Cleanup tensors
            xTensor.dispose();
            yTensor.dispose();
            // Save model
            await this.saveModel(metrics);
            this.modelVersion++;
            this.lastTrainingLoss = metrics.loss;
            this.lastTrainingAccuracy = metrics.accuracy;
            console.log(`[NeuralScorer] Training complete. Loss: ${metrics.loss.toFixed(4)}, Accuracy: ${metrics.accuracy.toFixed(4)}`);
            return {
                success: true,
                metrics,
                model: this.getModelInfo(),
                duration: Date.now() - startTime,
                completedAt: Date.now(),
            };
        }
        catch (error) {
            console.error('[NeuralScorer] Training failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metrics: this.getEmptyMetrics(),
                model: this.getModelInfo(),
                duration: Date.now() - startTime,
                completedAt: Date.now(),
            };
        }
        finally {
            this.isTraining = false;
        }
    }
    /**
     * Get model confidence (how well trained it is)
     */
    getConfidence() {
        if (this.modelVersion === 0)
            return 0;
        if (this.lastTrainingAccuracy === 0)
            return 0;
        // Confidence based on accuracy and training iterations
        const accuracyFactor = this.lastTrainingAccuracy;
        const versionFactor = Math.min(1, this.modelVersion / 10);
        return (accuracyFactor * 0.7 + versionFactor * 0.3);
    }
    /**
     * Get ML weight for hybrid scoring
     */
    getMLWeight() {
        // Start with low weight, increase with model maturity
        const baseWeight = 0.1;
        const maxWeight = 0.6;
        const confidence = this.getConfidence();
        return baseWeight + (maxWeight - baseWeight) * confidence;
    }
    /**
     * Check if model is ready for predictions
     */
    isReady() {
        return this.model !== null && this.modelVersion > 0;
    }
    /**
     * Get model version
     */
    getVersion() {
        return this.modelVersion;
    }
    /**
     * Prepare training data from dataset
     */
    prepareTrainingData(dataset) {
        const features = [];
        const labels = [];
        // Process all samples
        const allSamples = [
            ...dataset.positive,
            ...dataset.negative,
            ...dataset.partial,
        ];
        for (const sample of allSamples) {
            features.push((0, ml_sdk_1.flattenFeatureVector)(sample.features));
            labels.push(sample.label);
        }
        return { features, labels };
    }
    /**
     * Save model to storage
     */
    async saveModel(metrics) {
        const modelStorage = this.endpoints.storage.getModelStorage();
        await modelStorage.save(MODEL_KEY, this.model);
        // Save metadata
        await this.endpoints.storage.set('model-metadata', {
            version: this.modelVersion + 1,
            loss: metrics.loss,
            accuracy: metrics.accuracy,
            trainedAt: Date.now(),
        });
    }
    /**
     * Get model info
     */
    getModelInfo() {
        const inputDim = (0, ml_sdk_1.getFeatureVectorDimension)();
        return {
            version: this.modelVersion,
            parameters: this.model ? this.countParameters() : 0,
            architecture: '64-128-64-32-1 MLP',
            inputDimension: inputDim,
            outputDimension: 1,
        };
    }
    /**
     * Count model parameters
     */
    countParameters() {
        if (!this.model)
            return 0;
        let total = 0;
        for (const layer of this.model.layers) {
            for (const weight of layer.getWeights()) {
                total += weight.size;
            }
        }
        return total;
    }
    /**
     * Get empty metrics
     */
    getEmptyMetrics() {
        return {
            loss: 0,
            accuracy: 0,
            valLoss: 0,
            valAccuracy: 0,
            epochs: 0,
            lossHistory: [],
            accuracyHistory: [],
        };
    }
}
exports.NeuralScorer = NeuralScorer;
//# sourceMappingURL=neural-scorer.js.map
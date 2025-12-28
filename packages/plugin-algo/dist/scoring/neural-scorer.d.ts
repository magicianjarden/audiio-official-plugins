/**
 * Neural Scorer - TensorFlow.js neural network for preference prediction
 */
import type { MLCoreEndpoints, TrainingDataset, TrainingResult, FeatureVector } from '@audiio/ml-sdk';
export declare class NeuralScorer {
    private model;
    private endpoints;
    private modelVersion;
    private isTraining;
    private lastTrainingLoss;
    private lastTrainingAccuracy;
    /**
     * Initialize the neural scorer
     */
    initialize(endpoints: MLCoreEndpoints): Promise<void>;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Predict preference score for feature vectors
     */
    predict(features: FeatureVector[]): Promise<number[]>;
    /**
     * Predict single feature vector
     */
    predictSingle(features: FeatureVector): Promise<number>;
    /**
     * Train the model on a dataset
     */
    train(dataset: TrainingDataset): Promise<TrainingResult>;
    /**
     * Get model confidence (how well trained it is)
     */
    getConfidence(): number;
    /**
     * Get ML weight for hybrid scoring
     */
    getMLWeight(): number;
    /**
     * Check if model is ready for predictions
     */
    isReady(): boolean;
    /**
     * Get model version
     */
    getVersion(): number;
    /**
     * Prepare training data from dataset
     */
    private prepareTrainingData;
    /**
     * Save model to storage
     */
    private saveModel;
    /**
     * Get model info
     */
    private getModelInfo;
    /**
     * Count model parameters
     */
    private countParameters;
    /**
     * Get empty metrics
     */
    private getEmptyMetrics;
}
//# sourceMappingURL=neural-scorer.d.ts.map
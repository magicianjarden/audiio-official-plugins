/**
 * Trainer - Orchestrates model training
 */
import type { MLCoreEndpoints, TrainingDataset, TrainingResult, TrainingStatus } from '@audiio/ml-sdk';
import type { NeuralScorer } from '../scoring/neural-scorer';
export declare class Trainer {
    private endpoints;
    private neuralScorer;
    private state;
    private progress;
    private currentEpoch;
    private totalEpochs;
    private lastResult?;
    constructor(endpoints: MLCoreEndpoints, neuralScorer: NeuralScorer);
    /**
     * Train the model
     */
    train(dataset: TrainingDataset): Promise<TrainingResult>;
    /**
     * Get training status
     */
    getStatus(): TrainingStatus;
    /**
     * Enrich dataset with additional features
     */
    private enrichDataset;
}
//# sourceMappingURL=trainer.d.ts.map
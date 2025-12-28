/**
 * Emotion Provider - Audio-based emotion/mood detection
 *
 * Uses a CNN model trained on mel-spectrograms to predict valence/arousal.
 */
import type { EmotionFeatures, MLCoreEndpoints } from '@audiio/ml-sdk';
export declare class EmotionProvider {
    private model;
    private endpoints;
    private cache;
    private isLoading;
    constructor();
    /**
     * Initialize the emotion model
     */
    initialize(endpoints: MLCoreEndpoints): Promise<void>;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    /**
     * Get emotion features for a track
     */
    getEmotionFeatures(trackId: string): Promise<EmotionFeatures | null>;
    /**
     * Analyze audio buffer for emotion
     */
    analyzeAudio(audioData: Float32Array, sampleRate: number): Promise<EmotionFeatures | null>;
    /**
     * Create the emotion detection model
     */
    private createModel;
    /**
     * Compute mel spectrogram from audio
     */
    private computeMelSpectrogram;
    /**
     * Apply Hann window
     */
    private applyHannWindow;
    /**
     * Compute FFT magnitude (simplified)
     */
    private computeFFTMagnitude;
    /**
     * Apply mel filterbank
     */
    private applyMelFilterbank;
    /**
     * Resample audio
     */
    private resample;
    /**
     * Get default features when analysis fails
     */
    private getDefaultFeatures;
    /**
     * Cache features for a track
     */
    cacheFeatures(trackId: string, features: EmotionFeatures): void;
}
//# sourceMappingURL=emotion-provider.d.ts.map
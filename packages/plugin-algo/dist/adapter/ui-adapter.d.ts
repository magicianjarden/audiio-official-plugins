/**
 * UI Adapter - Bridges Audiio Algo plugin to the UI integration layer
 *
 * This is a simplified adapter that provides a UI-compatible interface.
 * Full integration with ml-core will be completed in the UI package.
 */
/**
 * Audio features type matching UI expectations
 */
interface UIAudioFeatures {
    bpm?: number;
    key?: string;
    mode?: 'major' | 'minor';
    energy?: number;
    danceability?: number;
    acousticness?: number;
    instrumentalness?: number;
    valence?: number;
    loudness?: number;
    speechiness?: number;
}
/**
 * Create a UI-compatible plugin wrapper for AudiioAlgorithm
 */
export declare function createUIPluginAdapter(): {
    manifest: {
        id: any;
        name: any;
        version: any;
        capabilities: {
            audioFeatures: boolean;
            emotionDetection: boolean;
            lyricsAnalysis: boolean;
            fingerprinting: boolean;
            embeddings: boolean;
            neuralScoring: boolean;
        };
    };
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    getAudioFeatures(_trackId: string): Promise<UIAudioFeatures | null>;
    findSimilar(_trackId: string, _limit: number): Promise<string[]>;
    scoreTrack(_track: unknown, _context: unknown): Promise<{
        score: number;
        confidence: number;
    }>;
};
/**
 * Export singleton factory
 */
export declare const audiioAlgoUIPlugin: {
    manifest: {
        id: any;
        name: any;
        version: any;
        capabilities: {
            audioFeatures: boolean;
            emotionDetection: boolean;
            lyricsAnalysis: boolean;
            fingerprinting: boolean;
            embeddings: boolean;
            neuralScoring: boolean;
        };
    };
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    getAudioFeatures(_trackId: string): Promise<UIAudioFeatures | null>;
    findSimilar(_trackId: string, _limit: number): Promise<string[]>;
    scoreTrack(_track: unknown, _context: unknown): Promise<{
        score: number;
        confidence: number;
    }>;
};
export default audiioAlgoUIPlugin;
//# sourceMappingURL=ui-adapter.d.ts.map
/**
 * Pipeline Hooks for Audiio Algorithm Plugin
 *
 * These hooks integrate with the Discover "See All" pipeline system,
 * allowing the algorithm plugin to enhance results using:
 * - Emotion/mood detection
 * - Lyrics sentiment analysis
 * - Audio feature matching (BPM, energy, key)
 * - Session flow optimization
 */

export { emotionTransformer } from './emotion-transformer';
export { lyricsTransformer } from './lyrics-transformer';
export { audioFeaturesTransformer } from './audio-features-transformer';
export { sessionFlowTransformer } from './session-flow-transformer';
export { registerAlgoPipelineHooks } from './register';

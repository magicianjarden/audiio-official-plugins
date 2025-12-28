/**
 * Spotify Streaming History Parser
 * Parses StreamingHistory*.json and extended history files
 */
import type { NormalizedHistoryEntry, ParseError } from '../types';
export interface HistoryParseResult {
    entries: NormalizedHistoryEntry[];
    errors: ParseError[];
    stats: {
        totalEntries: number;
        uniqueTracks: number;
        totalPlaytimeMs: number;
        dateRange: {
            start: string;
            end: string;
        } | null;
        skippedCount: number;
    };
}
export declare class HistoryParser {
    /**
     * Parse all streaming history files from a directory
     */
    parseDirectory(dirPath: string): HistoryParseResult;
    /**
     * Parse a single streaming history file
     */
    parseStreamingHistoryFile(filePath: string): {
        entries: NormalizedHistoryEntry[];
        errors: ParseError[];
    };
    /**
     * Parse extended streaming history file (more detailed)
     */
    parseExtendedHistoryFile(filePath: string): {
        entries: NormalizedHistoryEntry[];
        errors: ParseError[];
    };
    /**
     * Parse streaming history from file paths
     */
    parseFiles(filePaths: string[]): HistoryParseResult;
    /**
     * Normalize date format
     */
    private normalizeDate;
}
export declare function getHistoryParser(): HistoryParser;
//# sourceMappingURL=history-parser.d.ts.map
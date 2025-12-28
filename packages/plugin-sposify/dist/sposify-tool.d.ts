/**
 * SposifyTool - Implements the Tool interface for proper plugin loading
 */
import type { AddonManifest, ToolType } from '@audiio/core';
/**
 * Sposify Tool Plugin
 * Provides Spotify data integration capabilities
 */
export declare class SposifyTool {
    readonly id = "sposify";
    readonly name = "Sposify";
    readonly toolType: ToolType;
    readonly icon = "spotify";
    private mainWindow;
    private app;
    get manifest(): AddonManifest;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    /**
     * Register IPC handlers for Electron main process
     */
    registerHandlers(ipcMain: unknown, app: unknown): void;
    /**
     * Unregister IPC handlers
     */
    unregisterHandlers(): void;
    /**
     * Set the main window for sending events
     */
    setWindow(window: unknown): void;
    /**
     * Check if sposify is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const sposifyTool: SposifyTool;
//# sourceMappingURL=sposify-tool.d.ts.map
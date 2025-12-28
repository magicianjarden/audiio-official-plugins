/**
 * Sposify IPC Handlers
 * Registers all IPC handlers for the Sposify addon
 */
import { BrowserWindow } from 'electron';
/**
 * Set the main window for sending events
 */
export declare function setMainWindow(window: BrowserWindow): void;
/**
 * Register all Sposify IPC handlers
 */
export declare function registerSposifyHandlers(userDataPath: string): void;
/**
 * Unregister all Sposify IPC handlers
 */
export declare function unregisterSposifyHandlers(): void;
//# sourceMappingURL=sposify-handlers.d.ts.map
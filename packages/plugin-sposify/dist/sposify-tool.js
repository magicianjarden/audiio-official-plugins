"use strict";
/**
 * SposifyTool - Implements the Tool interface for proper plugin loading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sposifyTool = exports.SposifyTool = void 0;
const ipc_1 = require("./ipc");
/**
 * Sposify Tool Plugin
 * Provides Spotify data integration capabilities
 */
class SposifyTool {
    id = 'sposify';
    name = 'Sposify';
    toolType = 'data-transfer';
    icon = 'spotify';
    mainWindow = null;
    app = null;
    get manifest() {
        return {
            id: this.id,
            name: this.name,
            version: '1.0.0',
            roles: ['tool'],
        };
    }
    async initialize() {
        console.log('[SposifyTool] Initialized');
    }
    async dispose() {
        this.unregisterHandlers();
        console.log('[SposifyTool] Disposed');
    }
    /**
     * Register IPC handlers for Electron main process
     */
    registerHandlers(ipcMain, app) {
        this.app = app;
        // Get userDataPath from Electron app
        const electronApp = app;
        const userDataPath = electronApp.getPath('userData');
        // Register the sposify IPC handlers
        (0, ipc_1.registerSposifyHandlers)(userDataPath);
        console.log('[SposifyTool] Handlers registered');
    }
    /**
     * Unregister IPC handlers
     */
    unregisterHandlers() {
        (0, ipc_1.unregisterSposifyHandlers)();
        console.log('[SposifyTool] Handlers unregistered');
    }
    /**
     * Set the main window for sending events
     */
    setWindow(window) {
        this.mainWindow = window;
        // Cast to BrowserWindow for the setMainWindow function
        (0, ipc_1.setMainWindow)(window);
    }
    /**
     * Check if sposify is available
     */
    async isAvailable() {
        return true;
    }
}
exports.SposifyTool = SposifyTool;
// Export singleton instance
exports.sposifyTool = new SposifyTool();
//# sourceMappingURL=sposify-tool.js.map
/**
 * SposifyTool - Implements the Tool interface for proper plugin loading
 */

import type { AddonManifest, ToolType } from '@audiio/core';
import {
  registerSposifyHandlers,
  unregisterSposifyHandlers,
  setMainWindow,
} from './ipc';

/**
 * Sposify Tool Plugin
 * Provides Spotify data integration capabilities
 */
export class SposifyTool {
  readonly id = 'sposify';
  readonly name = 'Sposify';
  readonly toolType: ToolType = 'data-transfer';
  readonly icon = 'spotify';

  private mainWindow: unknown = null;
  private app: unknown = null;

  get manifest(): AddonManifest {
    return {
      id: this.id,
      name: this.name,
      version: '1.0.0',
      roles: ['tool'],
    };
  }

  async initialize(): Promise<void> {
    console.log('[SposifyTool] Initialized');
  }

  async dispose(): Promise<void> {
    this.unregisterHandlers();
    console.log('[SposifyTool] Disposed');
  }

  /**
   * Register IPC handlers for Electron main process
   */
  registerHandlers(ipcMain: unknown, app: unknown): void {
    this.app = app;

    // Get userDataPath from Electron app
    const electronApp = app as { getPath: (name: string) => string };
    const userDataPath = electronApp.getPath('userData');

    // Register the sposify IPC handlers
    registerSposifyHandlers(userDataPath);

    console.log('[SposifyTool] Handlers registered');
  }

  /**
   * Unregister IPC handlers
   */
  unregisterHandlers(): void {
    unregisterSposifyHandlers();
    console.log('[SposifyTool] Handlers unregistered');
  }

  /**
   * Set the main window for sending events
   */
  setWindow(window: unknown): void {
    this.mainWindow = window;
    // Cast to BrowserWindow for the setMainWindow function
    setMainWindow(window as import('electron').BrowserWindow);
  }

  /**
   * Check if sposify is available
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// Export singleton instance
export const sposifyTool = new SposifyTool();

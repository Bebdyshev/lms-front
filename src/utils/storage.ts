// Storage utility with fallback for when localStorage is not available
class StorageManager {
  private inMemoryStorage: Map<string, string> = new Map();
  private storageType: 'localStorage' | 'sessionStorage' | 'memory' = 'localStorage';

  constructor() {
    // Check which storage is available
    if (this.isStorageAvailable('localStorage')) {
      this.storageType = 'localStorage';
    } else if (this.isStorageAvailable('sessionStorage')) {
      this.storageType = 'sessionStorage';
    } else {
      this.storageType = 'memory';
      console.warn('Neither localStorage nor sessionStorage available, using in-memory storage');
    }
  }

  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.storageType === 'memory') {
        return this.inMemoryStorage.get(key) || null;
      }
      return window[this.storageType].getItem(key);
    } catch (e) {
      console.error('Storage getItem error:', e);
      return this.inMemoryStorage.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.storageType === 'memory') {
        this.inMemoryStorage.set(key, value);
      } else {
        window[this.storageType].setItem(key, value);
      }
    } catch (e) {
      console.error('Storage setItem error:', e);
      this.inMemoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      if (this.storageType === 'memory') {
        this.inMemoryStorage.delete(key);
      } else {
        window[this.storageType].removeItem(key);
      }
    } catch (e) {
      console.error('Storage removeItem error:', e);
      this.inMemoryStorage.delete(key);
    }
  }

  clear(): void {
    try {
      if (this.storageType === 'memory') {
        this.inMemoryStorage.clear();
      } else {
        window[this.storageType].clear();
      }
    } catch (e) {
      console.error('Storage clear error:', e);
      this.inMemoryStorage.clear();
    }
  }
}

// Export singleton instance
export const storage = new StorageManager();

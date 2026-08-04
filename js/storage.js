const DB_NAME = 'LeDuEnglishDB';
const DB_VERSION = 1;

const Storage = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('items')) {
                    db.createObjectStore('items', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('reviewRecords')) {
                    db.createObjectStore('reviewRecords', { keyPath: 'itemId' });
                }
                if (!db.objectStoreNames.contains('mistakeRecords')) {
                    db.createObjectStore('mistakeRecords', { keyPath: 'itemId' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'date' });
                }
            };
        });
    },

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async put(storeName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(value);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    },

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async getSettings() {
        const defaults = {
            dailyDurationMinutes: 35,
            dailyNewItemLimit: 10,
            autoPlayAudio: true,
            speechRate: 0.8,
            speechVoice: 'en-GB',
            reminderTime: '',
            masteryThreshold: 3
        };
        const stored = await this.get('settings', 'userSettings');
        return stored ? { ...defaults, ...stored.value } : defaults;
    },

    async setSettings(settings) {
        await this.put('settings', { key: 'userSettings', value: settings });
    },

    async exportToJSON() {
        const data = {
            version: '1.0.0',
            items: await this.getAll('items'),
            reviewRecords: await this.getAll('reviewRecords'),
            mistakeRecords: await this.getAll('mistakeRecords'),
            settings: await this.getSettings(),
            logs: await this.getAll('logs'),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    async importFromJSON(jsonString) {
        const data = JSON.parse(jsonString);
        await this.clear('items');
        await this.clear('reviewRecords');
        await this.clear('mistakeRecords');
        await this.clear('logs');

        for (const item of data.items || []) await this.put('items', item);
        for (const rec of data.reviewRecords || []) await this.put('reviewRecords', rec);
        for (const rec of data.mistakeRecords || []) await this.put('mistakeRecords', rec);
        for (const log of data.logs || []) await this.put('logs', log);
        if (data.settings) await this.setSettings(data.settings);
    }
};

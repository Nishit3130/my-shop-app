// import { Injectable } from '@angular/core';

// declare global {
//   interface Window {
//     electronAPI: any;
//   }
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class StorageService {
//   private memoryStorage: Map<string, string> = new Map();
//   private isElectron: boolean = false;

//   constructor() {
//     this.isElectron = this.checkElectron();
//   }

//   private checkElectron(): boolean {
//     try {
//       return typeof window !== 'undefined' && 
//              window.electronAPI !== undefined && 
//              window.electronAPI !== null;
//     } catch (e) {
//       return false;
//     }
//   }

//   /**
//    * Saves data to SQLite via IPC if in Electron, otherwise to memory/localStorage
//    */
//   async saveData(key: string, data: any): Promise<void> {
//     const serializedData = JSON.stringify(data);
//     if (this.isElectron) {
//       try {
//         await window.electronAPI.setSetting(key, serializedData);
//       } catch (error) {
//         console.error('Error saving data to database:', error);
//         this.memoryStorage.set(key, serializedData);
//       }
//     } else {
//       this.memoryStorage.set(key, serializedData);
//     }
//   }

//   /**
//    * Retrieves data from SQLite via IPC if in Electron, otherwise from memory/localStorage
//    */
//   async getData(key: string): Promise<any> {
//     if (this.isElectron) {
//       try {
//         const result = await window.electronAPI.getSetting(key);
//         if (result && result.success && result.data) {
//           return result.data ? JSON.parse(result.data.value) : null;
//         }
//         return null;
//       } catch (error) {
//         console.error('Error retrieving data from database:', error);
//         return null;
//       }
//     } else {
//       const data = this.memoryStorage.get(key);
//       return data ? JSON.parse(data) : null;
//     }
//   }

//   /**
//    * Removes data from SQLite or memory
//    */
//   async removeData(key: string): Promise<void> {
//     if (this.isElectron) {
//       try {
//         await window.electronAPI.setSetting(key, null);
//       } catch (error) {
//         console.error('Error removing data from database:', error);
//         this.memoryStorage.delete(key);
//       }
//     } else {
//       this.memoryStorage.delete(key);
//     }
//   }

//   /**
//    * Clears all data
//    */
//   async clearAllData(): Promise<void> {
//     if (this.isElectron) {
//       try {
//         const allSettings = await window.electronAPI.getAllSettings();
//         if (allSettings && allSettings.success && Array.isArray(allSettings.data)) {
//           for (const setting of allSettings.data) {
//             await window.electronAPI.setSetting(setting.key, null);
//           }
//         }
//       } catch (error) {
//         console.error('Error clearing database:', error);
//         this.memoryStorage.clear();
//       }
//     } else {
//       this.memoryStorage.clear();
//     }
//   }

//   /**
//    * Generates a unique ID
//    */
//   generateId(): string {
//     return Date.now().toString(36) + Math.random().toString(36).substring(2);
//   }

//   /**
//    * Gets next sequence number for auto-increment functionality
//    */
//   async getNextSequence(key: string): Promise<number> {
//     const sequence = await this.getData(key);
//     return sequence ? (Number(sequence) + 1) : 1;
//   }

//   /**
//    * Saves a sequence number
//    */
//   async saveSequence(key: string, sequence: number): Promise<void> {
//     await this.saveData(key, sequence);
//   }
// }

// src/app/services/storage.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  // Synchronous LocalStorage implementation for un-migrated services.
  // We will delete this service entirely once all components use SQLite!
  
  saveData(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  getData(key: string): any {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  removeData(key: string): void {
    localStorage.removeItem(key);
  }

  clearAllData(): void {
    localStorage.clear();
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  getNextSequence(key: string): number {
    const sequence = this.getData(key);
    return sequence ? (Number(sequence) + 1) : 1;
  }

  saveSequence(key: string, sequence: number): void {
    this.saveData(key, sequence);
  }
}
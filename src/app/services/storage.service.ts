import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private memoryStorage: Map<string, string> = new Map();

  constructor() { }

  private get hasLocalStorage(): boolean {
    try {
      return typeof window !== 'undefined' &&
             window.localStorage !== undefined &&
             window.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  saveData(key: string, data: any): void {
    const serializedData = JSON.stringify(data);
    if (this.hasLocalStorage) {
      window.localStorage.setItem(key, serializedData);
    } else {
      this.memoryStorage.set(key, serializedData);
    }
  }

  getData(key: string): any {
    let data: string | null = null;
    if (this.hasLocalStorage) {
      data = window.localStorage.getItem(key);
    } else {
      data = this.memoryStorage.get(key) || null;
    }
    return data ? JSON.parse(data) : null;
  }

  removeData(key: string): void {
    if (this.hasLocalStorage) {
      window.localStorage.removeItem(key);
    } else {
      this.memoryStorage.delete(key);
    }
  }

  clearAllData(): void {
    if (this.hasLocalStorage) {
      window.localStorage.clear();
    } else {
      this.memoryStorage.clear();
    }
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Generic methods for handling sequences
  getNextSequence(key: string): number {
    const sequence = this.getData(key);
    return sequence ? (Number(sequence) + 1) : 1;
  }

  saveSequence(key: string, sequence: number): void {
    this.saveData(key, sequence);
  }
}
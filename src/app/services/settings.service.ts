import { Injectable, inject } from '@angular/core';
import { AppSettings } from '../models/settings.model';
import { StorageService } from './storage.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_KEY = 'app_settings';
  private storageService = inject(StorageService);

  private settingsSubject: BehaviorSubject<AppSettings>;
  public settings$: Observable<AppSettings>;

  constructor() {
    const savedSettings = this.storageService.getData(this.SETTINGS_KEY);
    const initialSettings = savedSettings ? savedSettings : this.getDefaultSettings();
    this.settingsSubject = new BehaviorSubject<AppSettings>(initialSettings);
    this.settings$ = this.settingsSubject.asObservable();
  }

  private getDefaultSettings(): AppSettings {
    return {
      companyName: 'My Shop',
      address: '123 Main Street, Anytown',
      phone: '9876543210',
      email: 'contact@myshop.com',
      gstin: 'YOUR_GSTIN_HERE',
      currencySymbol: '₹'
    };
  }

  getSettings(): AppSettings {
    return this.settingsSubject.getValue();
  }

  saveSettings(settings: AppSettings): void {
    this.storageService.saveData(this.SETTINGS_KEY, settings);
    this.settingsSubject.next(settings); // Notify all subscribers
    // The alert is better handled by the component.
  }
}
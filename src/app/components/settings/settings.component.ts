// src/app/components/settings/settings.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;

  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);

  constructor() {
    this.settingsForm = this.fb.group({
      companyName: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      gstin: [''],
      currencySymbol: ['₹', [Validators.required]],
      companyLogo: [''], 
      invoiceFooter: ['']
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    const currentSettings = this.settingsService.getSettings();
    this.settingsForm.patchValue(currentSettings);
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched(); // Show errors if any
      return;
    }

    this.settingsService.saveSettings(this.settingsForm.value);
  }
  onLogoSelect(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      if (!file.type.startsWith('image')) {
        // REVERTED to use alert()
        alert('Please select an image file.');
        return;
      }
      if (file.size > 500000) { // 500 KB limit
        // REVERTED to use alert()
        alert('Image size should be less than 500KB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.settingsForm.patchValue({ companyLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo(): void {
    this.settingsForm.patchValue({ companyLogo: null });
  }

}
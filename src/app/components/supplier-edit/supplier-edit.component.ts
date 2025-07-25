// src/app/components/supplier-edit/supplier-edit.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../models/supplier.model';

@Component({
  selector: 'app-supplier-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './supplier-edit.component.html',
  styleUrls: ['./supplier-edit.component.css']
})
export class SupplierEditComponent implements OnInit {
  supplierForm: FormGroup;
  editMode = false;
  currentSupplierId: string | null = null;
  pageTitle = 'Add New Supplier';
  isLoading = false;
  isSaving = false;

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supplierService = inject(SupplierService);

  constructor() {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.pattern('^[0-9]{10,15}$')]], // Optional but must be valid if present
      email: ['', [Validators.email]], // Optional but must be valid if present
      address: [''],
      gstin: ['']
    });
  }

  ngOnInit(): void {
    this.currentSupplierId = this.route.snapshot.paramMap.get('id');
    if (this.currentSupplierId) {
      this.editMode = true;
      this.pageTitle = 'Edit Supplier';
      this.loadSupplierData();
    }
  }

  loadSupplierData(): void {
    if (!this.currentSupplierId) return;
    this.isLoading = true;
    const supplier = this.supplierService.getSupplierById(this.currentSupplierId);
    if (supplier) {
      this.supplierForm.patchValue({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        gstin: supplier.gstin || ''
      });
    } else {
      alert('Supplier not found!');
      this.router.navigate(['/suppliers']);
    }
    this.isLoading = false;
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isSaving = true;
    const supplierData = this.supplierForm.value;

    try {
      if (this.editMode && this.currentSupplierId) {
        // Update existing supplier
        this.supplierService.updateSupplier(this.currentSupplierId, supplierData);
      } else {
        // Add new supplier
        this.supplierService.addSupplier(supplierData);
      }
      alert(`Supplier ${this.editMode ? 'updated' : 'added'} successfully!`);
      this.router.navigate(['/suppliers']);
    } catch (error: any) {
      // The service will throw an error for duplicates, which we catch here.
      // The service already shows an alert, so we just log it and stop saving.
      console.error('Error saving supplier:', error.message);
    } finally {
      this.isSaving = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/suppliers']);
  }
}
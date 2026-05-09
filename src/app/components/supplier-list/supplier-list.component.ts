import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../models/supplier.model';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.css']
})
export class SupplierListComponent implements OnInit, OnDestroy {
  allSuppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';

  showDeleteConfirmation: boolean = false;
  supplierToDelete: Supplier | null = null;

  private subscriptions = new Subscription();
  private supplierService = inject(SupplierService);
  private router = inject(Router);

  constructor() {
    // The manual navigation subscription is no longer needed with reactive services.
  }

  ngOnInit(): void {
    this.isLoading = true;
    const suppliersSub = this.supplierService.suppliers$.subscribe(suppliers => {
      this.allSuppliers = suppliers.sort((a, b) => a.name.localeCompare(b.name));
      this.applyFilters();
      this.isLoading = false;
    });
    this.subscriptions.add(suppliersSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadSuppliers(): void {
    // Obsolete method, replaced by ngOnInit subscription. Kept for posterity.
    this.isLoading = true;
    this.allSuppliers = this.supplierService.getSuppliers().sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredSuppliers = [...this.allSuppliers];
    } else {
      this.filteredSuppliers = this.allSuppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(term) ||
        (supplier.phone && supplier.phone.includes(term)) ||
        (supplier.email && supplier.email.toLowerCase().includes(term))
      );
    }
  }

  viewLedger(supplierId: string): void {
    this.router.navigate(['/suppliers', supplierId, 'ledger']);
  }

  editSupplier(supplierId: string): void {
    this.router.navigate(['/suppliers/edit', supplierId]);
  }

  requestDeleteSupplier(supplier: Supplier): void {
    this.supplierToDelete = supplier;
    this.showDeleteConfirmation = true;
  }

  // confirmDeleteSupplier(): void {
  //   if (this.supplierToDelete) {
  //     try {
  //       const success = this.supplierService.deleteSupplier(this.supplierToDelete.id);
  //       if (success) {
  //         alert(`Supplier "${this.supplierToDelete.name}" deleted successfully.`);
  //       } else {
  //         alert(`Could not delete supplier "${this.supplierToDelete.name}".`);
  //       }
  //     } catch (error: any) {
  //       alert(`Error deleting supplier: ${error.message}`);
  //     } finally {
  //       this.cancelDeleteSupplier();
  //     }
  //   }
  // }
async confirmDeleteSupplier() {
  if (this.supplierToDelete) {
    const success = await this.supplierService.deleteSupplier(this.supplierToDelete.id);
    if (success) {
      this.showDeleteConfirmation = false;
    }
  }
}
  cancelDeleteSupplier(): void {
    this.showDeleteConfirmation = false;
    this.supplierToDelete = null;
  }
}
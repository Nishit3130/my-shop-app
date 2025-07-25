import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BillingService } from '../../services/billing.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css']
})
export class CustomerListComponent implements OnInit, OnDestroy {
  allCustomers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';

  showCustomerDeleteConfirmation: boolean = false;
  customerToDelete: Customer | null = null;

  private subscriptions = new Subscription();
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private billingService = inject(BillingService);

  ngOnInit(): void {
    this.isLoading = true;
    const customersSub = this.customerService.customers$.subscribe(customers => {
      this.allCustomers = customers.sort((a, b) => a.name.localeCompare(b.name));
      this.applyFilters();
      this.isLoading = false;
    });
    this.subscriptions.add(customersSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadCustomers(): void {
    // Obsolete method, replaced by ngOnInit subscription.
    this.isLoading = true;
    this.allCustomers = this.customerService.getCustomers().sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredCustomers = [...this.allCustomers];
    } else {
      this.filteredCustomers = this.allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(term) ||
        (customer.phone && customer.phone.toLowerCase().includes(term)) ||
        (customer.email && customer.email.toLowerCase().includes(term))
      );
    }
  }

  viewLedger(customerId: string): void {
    this.router.navigate(['/customers', customerId, 'ledger']);
  }

  editCustomer(customerId: string): void {
    this.router.navigate(['/customers/edit', customerId]);
  }

requestDeleteCustomer(customer: Customer): void {
    const customerBills = this.billingService.getBillsByCustomerId(customer.id);
    if (customerBills.length > 0) {
      alert(`This customer cannot be deleted because they have ${customerBills.length} associated bill(s).`);
      return; 
    }
    
    this.customerToDelete = customer;
    this.showCustomerDeleteConfirmation = true;
  }

confirmDeleteCustomer(): void {
    if (this.customerToDelete) {
      const success = this.customerService.deleteCustomer(this.customerToDelete.id);
      if (success) {
        alert(`Customer "${this.customerToDelete.name}" deleted successfully.`);
      } else {
        alert(`Could not delete customer "${this.customerToDelete.name}".`);
      }
      this.cancelDeleteCustomer();
    }
  }

  cancelDeleteCustomer(): void {
    this.showCustomerDeleteConfirmation = false;
    this.customerToDelete = null;
  }
}
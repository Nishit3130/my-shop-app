import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-customer-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-edit.component.html',
  styleUrls: ['./customer-edit.component.css']
})
export class CustomerEditComponent implements OnInit {
  customerId: string | null = null;
  customer: Customer | null = null; // For holding the full customer object being edited
  
  // Form model properties
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  customerAddress: string = '';
  // creditBalance is not typically edited directly here
  
  isLoading: boolean = false;
  isSaving: boolean = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerService = inject(CustomerService);

  ngOnInit(): void {
    this.isLoading = true;
    this.customerId = this.route.snapshot.paramMap.get('id'); // Get ID from route
    if (this.customerId) {
      const fetchedCustomer = this.customerService.getCustomerById(this.customerId);
      if (fetchedCustomer) {
        this.customer = fetchedCustomer;
        // Populate form fields
        this.customerName = this.customer.name;
        this.customerPhone = this.customer.phone || '';
        this.customerEmail = this.customer.email || '';
        this.customerAddress = this.customer.address || '';
      } else {
        alert('Customer not found!');
        this.router.navigate(['/customers']); // Redirect if customer not found
      }
    } else {
      alert('No customer ID provided for editing.');
      this.router.navigate(['/customers']); // Redirect if no ID
    }
    this.isLoading = false;
  }

  // saveCustomer(): void {
  //   if (!this.customer || !this.customerId) {
  //     alert('Error: No customer data to save.');
  //     return;
  //   }
  //   if (!this.customerName.trim()) {
  //       alert('Customer name cannot be empty.');
  //       return;
  //   }

  //   this.isSaving = true;

  //   const updatedCustomerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'creditBalance'>> = {
  //     name: this.customerName.trim(),
  //     phone: this.customerPhone.trim() || undefined,
  //     email: this.customerEmail.trim() || undefined,
  //     address: this.customerAddress.trim() || undefined,
  //     // creditBalance is not updated from this form
  //     // updatedAt will be handled by the service
  //   };

  //   try {
  //     const result = this.customerService.updateCustomer(this.customerId, updatedCustomerData);
  //     if (result) {
  //       alert('Customer details updated successfully!');
  //       this.router.navigate(['/customers']);
  //     } else {
  //       alert('Failed to update customer. Customer not found or no changes made.');
  //       // The service might have alerted for duplicate phone/email already
  //     }
  //   } catch (error: any) {
  //       // Catch errors thrown by customerService (e.g., duplicate phone/email)
  //       console.error("Error updating customer:", error);
  //       alert(`Error: ${error.message || 'Could not update customer details.'}`);
  //   } finally {
  //       this.isSaving = false;
  //   }
  // }
async saveCustomer(): Promise<void> {
    if (!this.customer || !this.customerId) return;
    if (!this.customerName.trim()) { alert('Name required'); return; }

    this.isSaving = true;
    const updatedData = {
      name: this.customerName.trim(),
      phone: this.customerPhone.trim() || undefined,
      email: this.customerEmail.trim() || undefined,
      address: this.customerAddress.trim() || undefined,
    };

    try {
      // Added await here
      const success = await this.customerService.updateCustomer(this.customerId, updatedData);
      if (success) {
        alert('Customer updated successfully!');
        this.router.navigate(['/customers']);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      this.isSaving = false;
    }
  }
  cancelEdit(): void {
    this.router.navigate(['/customers']);
  }
}
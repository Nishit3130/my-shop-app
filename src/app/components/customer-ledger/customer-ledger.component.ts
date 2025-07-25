import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { BillingService } from '../../services/billing.service';
import { PaymentService } from '../../services/payment.service';
import { Customer } from '../../models/customer.model';
import { Bill, PaymentType } from '../../models/bill.model';
import { Payment } from '../../models/payment.model';

// Interface for a unified ledger transaction view
export interface LedgerTransaction {
    date: Date;
    type: 'Bill' | 'Payment';
    description: string;
    referenceId?: string;
    debit: number | null;   // Amount increasing customer due (e.g., new bill)
    credit: number | null;  // Amount decreasing customer due (e.g., payment)
    balance: number;        // Running balance for the customer
}

@Component({
    selector: 'app-customer-ledger',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, RouterLink],
    templateUrl: './customer-ledger.component.html',
    styleUrls: ['./customer-ledger.component.css']
})
export class CustomerLedgerComponent implements OnInit {
    customerId: string = '';
    customer: Customer | null = null;
    transactions: LedgerTransaction[] = [];
    isLoading: boolean = false;
    ledgerEndingBalance: number = 0;
    today: Date = new Date();

    private customerService = inject(CustomerService);
    private billingService = inject(BillingService);
    private paymentService = inject(PaymentService);
    private route = inject(ActivatedRoute);

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.customerId = id;
                this.loadLedgerData();
            } else {
                console.error('Customer ID not found in route parameters');
                this.resetLedger();
            }
        });
    }

    loadLedgerData(): void {
        if (!this.customerId) {
            this.resetLedger();
            return;
        }
        this.isLoading = true;
        this.resetLedger();

        this.customer = this.customerService.getCustomerById(this.customerId) ?? null;
        if (!this.customer) {
            console.error(`Customer with ID ${this.customerId} not found.`);
            this.isLoading = false;
            return;
        }

        const creditBills = this.billingService.getBillsByCustomerId(this.customerId)
            .filter(bill => bill.paymentType === PaymentType.CREDIT);
        const payments = this.paymentService.getPaymentsByCustomerId(this.customerId);

        // Combine bills and payments into a single list for sorting
        const rawTransactions: { date: Date; type: 'Bill' | 'Payment'; data: Bill | Payment }[] = [
            ...creditBills.map(bill => ({ date: bill.createdAt, type: 'Bill' as const, data: bill })),
            ...payments.map(payment => ({ date: payment.paymentDate, type: 'Payment' as const, data: payment }))
        ];

        // Sort all transactions chronologically
        rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        this.transactions = rawTransactions.map(rawTx => {
            let debit: number | null = null;
            let credit: number | null = null;
            let description = '';
            let referenceId = rawTx.data.id.substring(0, 8);

            if (rawTx.type === 'Bill') {
                const bill = rawTx.data as Bill;
                debit = bill.total; // A new bill is a debit (customer owes more)
                runningBalance += debit;
                description = `Credit Bill Issued (#${bill.billNo || referenceId})`;
                referenceId = bill.billNo || referenceId;
            } else { // Payment
                const payment = rawTx.data as Payment;
                credit = payment.amount; // A payment is a credit (customer owes less)
                runningBalance -= credit;
                referenceId = payment.id.substring(0, 8);
                if (payment.paymentMethod === 'CREDIT_BALANCE') {
                    description = `Applied from available credit`;
                } else {
                    description = `Payment Received via ${payment.paymentMethod || 'Unknown'}`;
                }
            }

            return {
                date: new Date(rawTx.date),
                type: rawTx.type,
                description: description,
                referenceId: referenceId,
                debit: debit,
                credit: credit,
                balance: parseFloat(runningBalance.toFixed(2))
            };
        });

        this.ledgerEndingBalance = runningBalance;
        this.isLoading = false;
    }

    private resetLedger(): void {
        this.customer = null;
        this.transactions = [];
        this.isLoading = false;
        this.ledgerEndingBalance = 0;
    }

    printLedger(): void {
        window.print();
    }
}
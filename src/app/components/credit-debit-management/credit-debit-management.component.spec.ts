import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditDebitManagementComponent } from './credit-debit-management.component';

describe('CreditDebitManagementComponent', () => {
  let component: CreditDebitManagementComponent;
  let fixture: ComponentFixture<CreditDebitManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditDebitManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditDebitManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

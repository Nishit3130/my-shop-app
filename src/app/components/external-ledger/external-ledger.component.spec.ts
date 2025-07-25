import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalLedgerComponent } from './external-ledger.component';

describe('ExternalLedgerComponent', () => {
  let component: ExternalLedgerComponent;
  let fixture: ComponentFixture<ExternalLedgerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalLedgerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExternalLedgerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

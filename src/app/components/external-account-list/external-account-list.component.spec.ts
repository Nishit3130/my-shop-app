import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalAccountListComponent } from './external-account-list.component';

describe('ExternalAccountListComponent', () => {
  let component: ExternalAccountListComponent;
  let fixture: ComponentFixture<ExternalAccountListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalAccountListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExternalAccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

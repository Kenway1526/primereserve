import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffMgmt } from './staff-mgmt';

describe('StaffMgmt', () => {
  let component: StaffMgmt;
  let fixture: ComponentFixture<StaffMgmt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMgmt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffMgmt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

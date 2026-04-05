import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryMgmt } from './inventory-mgmt';

describe('InventoryMgmt', () => {
  let component: InventoryMgmt;
  let fixture: ComponentFixture<InventoryMgmt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryMgmt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryMgmt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

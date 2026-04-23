import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderEntry } from './order-entry';

describe('OrderEntry', () => {
  let component: OrderEntry;
  let fixture: ComponentFixture<OrderEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderEntry]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderEntry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

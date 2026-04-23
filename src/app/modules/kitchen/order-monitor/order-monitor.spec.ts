import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderMonitor } from './order-monitor';

describe('OrderMonitor', () => {
  let component: OrderMonitor;
  let fixture: ComponentFixture<OrderMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderMonitor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderMonitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

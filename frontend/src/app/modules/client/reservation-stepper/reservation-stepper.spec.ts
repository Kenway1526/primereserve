import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationStepper } from './reservation-stepper';

describe('ReservationStepper', () => {
  let component: ReservationStepper;
  let fixture: ComponentFixture<ReservationStepper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationStepper]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservationStepper);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

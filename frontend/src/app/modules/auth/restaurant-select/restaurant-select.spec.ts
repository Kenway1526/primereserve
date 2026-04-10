import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSelect } from './restaurant-select';

describe('RestaurantSelect', () => {
  let component: RestaurantSelect;
  let fixture: ComponentFixture<RestaurantSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

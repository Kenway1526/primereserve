import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantCatalog } from './restaurant-catalog';

describe('RestaurantCatalog', () => {
  let component: RestaurantCatalog;
  let fixture: ComponentFixture<RestaurantCatalog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantCatalog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantCatalog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

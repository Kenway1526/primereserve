import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarReserva } from './confirmar-reserva';

describe('ConfirmarReserva', () => {
  let component: ConfirmarReserva;
  let fixture: ComponentFixture<ConfirmarReserva>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarReserva]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmarReserva);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Pago {
  id: number;
  mesa: string;
  metodo: 'Tarjeta' | 'Efectivo' | 'Transferencia';
  hora: string;
  monto: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css'
})
export class Payments implements OnInit {
  // Resumen de caja
  public procesados: number = 363;
  public pendientes: number = 657;
  public ventasDia: number = 0;

  // Listado de transacciones
  public historialPagos: Pago[] = [
    { id: 1, mesa: 'Mesa 8', metodo: 'Tarjeta', hora: '11:00', monto: 240 },
    { id: 2, mesa: 'Mesa 3', metodo: 'Efectivo', hora: '11:30', monto: 123 }
  ];

  ngOnInit(): void {
    this.calcularVentasDia();
  }

  calcularVentasDia() {
    this.ventasDia = this.historialPagos.reduce((acc, pago) => acc + pago.monto, 0);
  }
}
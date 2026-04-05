import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';    

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders implements OnInit {
  
  public ordenes = [
    {
      mesa: 'MESA 2',
      pedidos: 2,
      total: 486,
      status: 'Pendiente',
      logs: ['12:30 — sent', '13:10 — sent'],
      items: [
        { cant: 1, nombre: 'Foie Gras Torchon', precio: 42 },
        { cant: 1, nombre: 'Wagyu A5 Ribeye', precio: 120 },
        { cant: 1, nombre: 'Dom Pérignon 2012', precio: 324 }
      ]
    },
    {
      mesa: 'MESA 4',
      pedidos: 1,
      total: 125,
      status: 'Pagada',
      logs: ['14:20 — Pagado'],
      items: [
        { cant: 1, nombre: 'Reserva Especial Cabernet', precio: 125 }
      ]
    },
    {
      mesa: 'MESA 1',
      pedidos: 3,
      total: 215,
      status: 'Pendiente',
      logs: ['18:15 — sent', '18:45 — sent', '19:10 — sent'],
      items: [
        { cant: 2, nombre: 'Ostras Rockefeller', precio: 56 },
        { cant: 1, nombre: 'Tartar de Atún Bluefin', precio: 38 },
        { cant: 2, nombre: 'Cocktail Old Fashioned', precio: 121 }
      ]
    },
    {
      mesa: 'TERRAZA 5',
      pedidos: 1,
      total: 890,
      status: 'Pendiente',
      logs: ['20:00 — sent'],
      items: [
        { cant: 1, nombre: 'Caviar Almas (30g)', precio: 750 },
        { cant: 2, nombre: 'Vino Blanco Chardonnay', precio: 140 }
      ]
    },
    {
      mesa: 'VIP 1',
      pedidos: 2,
      total: 540,
      status: 'Pagada',
      logs: ['21:30 — Pagado (Amex)'],
      items: [
        { cant: 1, nombre: 'Corte Tomahawk Oro', precio: 450 },
        { cant: 3, nombre: 'Mixology Signature', precio: 90 }
      ]
    }
  ];

  ngOnInit(): void {
    console.log("Módulo de Órdenes listo con 5 registros.");
  }
}
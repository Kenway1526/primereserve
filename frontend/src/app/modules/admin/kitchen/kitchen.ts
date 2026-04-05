import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Plato {
  cant: number;
  nombre: string;
}

interface TicketCocina {
  id: number;
  mesa: string;
  tiempo: number; // Minutos transcurridos
  platos: Plato[];
  estado: 'pendiente' | 'preparacion' | 'listo';
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen.html',
  styleUrl: './kitchen.css'
})
export class Kitchen implements OnInit {
  
  public tickets: TicketCocina[] = [
    {
      id: 1, mesa: 'Mesa 5', tiempo: 3, estado: 'pendiente',
      platos: [{ cant: 2, nombre: 'Tartare de Atún' }, { cant: 1, nombre: 'Langosta Thermidor' }]
    },
    {
      id: 2, mesa: 'Mesa 3', tiempo: 1, estado: 'pendiente',
      platos: [{ cant: 2, nombre: 'Soufflé de Chocolate' }, { cant: 1, nombre: 'Dom Pérignon 2012' }]
    },
    {
      id: 3, mesa: 'Mesa 2', tiempo: 12, estado: 'preparacion',
      platos: [{ cant: 1, nombre: 'Foie Gras Torchon' }, { cant: 1, nombre: 'Wagyu A5 Ribeye' }]
    },
    {
      id: 4, mesa: 'Mesa 8', tiempo: 22, estado: 'listo',
      platos: [{ cant: 1, nombre: 'Risotto al Tartufo' }]
    }
  ];

  ngOnInit(): void {}

  // Lógica para mover el ticket a la siguiente fase
  avanzarEstado(ticket: TicketCocina) {
    if (ticket.estado === 'pendiente') {
      ticket.estado = 'preparacion';
    } else if (ticket.estado === 'preparacion') {
      ticket.estado = 'listo';
    } else {
      // Si ya está listo, se despacha (se elimina de la vista)
      this.tickets = this.tickets.filter(t => t.id !== ticket.id);
    }
  }

  // Filtros para las columnas
  get pendientes() { return this.tickets.filter(t => t.estado === 'pendiente'); }
  get preparacion() { return this.tickets.filter(t => t.estado === 'preparacion'); }
  get listos() { return this.tickets.filter(t => t.estado === 'listo'); }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink], // RouterLink se queda aquí para los botones del HTML
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  // Estas son las variables que el HTML de Cliente NECESITA
  public activeReservations = [
    { date: '2026-04-10', time: '20:00', people: 4, status: 'Confirmada' }
  ];

  public lastVisits = [
    { restaurant: 'Prime Steakhouse', date: '2026-03-15', items: 'Ribeye', total: 2450 }
  ];

  constructor() {}
  ngOnInit(): void {}
}
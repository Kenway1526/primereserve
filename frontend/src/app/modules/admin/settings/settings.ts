import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  
  // Datos del Restaurante
  public restaurantInfo = {
    nombre: 'La Maison Dorée',
    direccion: 'Av. Reforma 222, CDMX',
    telefono: '+52 55 1234 5678',
    sitioWeb: 'https://lamaisondoree.mx',
    colorAcento: '#d4af37'
  };

  // Horarios
  public horarios = [
    { dia: 'Lunes', apertura: '12:00', cierre: '23:00' },
    { dia: 'Martes', apertura: '12:00', cierre: '23:00' },
    { dia: 'Miércoles', apertura: '12:00', cierre: '23:00' },
    { dia: 'Jueves', apertura: '12:00', cierre: '23:00' },
    { dia: 'Viernes', apertura: '12:00', cierre: '23:00' },
    { dia: 'Sábado', apertura: '12:00', cierre: '23:00' },
    { dia: 'Domingo', apertura: '12:00', cierre: '23:00' }
  ];

  ngOnInit(): void {}

  saveConfig() {
    console.log('Configuración guardada:', {
      info: this.restaurantInfo,
      horarios: this.horarios
    });
    alert('Configuración actualizada con éxito');
  }
}
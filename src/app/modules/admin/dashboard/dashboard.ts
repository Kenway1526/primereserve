import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, PLATFORM_ID, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 Importación de la constante

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private chartInstances: Chart[] = [];
  
  // 🚀 Sincronizamos con el ID estático
  private restaurantId: string = APP_CONFIG.RESTAURANT_ID;

  @ViewChild('salesChart') salesChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('efficiencyChart') efficiencyChart!: ElementRef<HTMLCanvasElement>;

  public reportDate: string = '';
  public metrics = {
    ingresosDia: 0,
    pagosPendientes: 0, 
    reservaciones: 0,
    mesasOcupadas: '0/0',
    ticketsCocina: 0
  };

  // Estos podrían venir de una consulta Top 5 en el futuro
  public topPlatillos = [
    { nombre: 'Wagyu A5 Ribeye', unidades: 2, precio: 450 },
    { nombre: 'Langosta Thermidor', unidades: 1, precio: 380 },
    { nombre: 'Soufflé de Chocolate', unidades: 1, precio: 120 }
  ];

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.reportDate = new Date().toLocaleString();
      await this.fetchRealMetrics();
    }
  }

  async fetchRealMetrics() {
    try {
      // 1. Ingresos del día (Órdenes Pagadas)
      const { data: ordenes } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('total')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Sincronizado
        .eq('estado', 'PAGADO');

      if (ordenes) {
        this.metrics.ingresosDia = ordenes.reduce((acc, o) => acc + (o.total || 0), 0);
      }

      // 2. Conteo de Reservaciones hoy
      const hoy = new Date().toISOString().split('T')[0];
      const { count: resCount } = await this.supabaseSvc.supabase
        .from('Reservacion')
        .select('*', { count: 'exact', head: true })
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .eq('fecha', hoy);
      
      this.metrics.reservaciones = resCount || 0;

      // 3. Tickets en Cocina (Abiertas o en preparación)
      const { count: kitchenCount } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('*', { count: 'exact', head: true })
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .in('estado', ['ABIERTA', 'EN_PREPARACION']);

      this.metrics.ticketsCocina = kitchenCount || 0;

    } catch (err) {
      console.error('Error al cargar métricas del Dashboard:', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Un pequeño delay para asegurar que los elementos Canvas existan en el DOM
      setTimeout(() => this.renderAllCharts(), 500);
    }
  }

  ngOnDestroy(): void {
    this.chartInstances.forEach(chart => chart.destroy());
  }

  private renderAllCharts() {
    // Limpiamos instancias previas si existieran
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances = [];

    this.chartInstances.push(this.createBarChart());
    this.chartInstances.push(this.createDonutChart());
    this.chartInstances.push(this.createRadarChart());
  }

  private createBarChart() {
    return new Chart(this.salesChart.nativeElement, {
      type: 'bar',
      data: {
        labels: ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        datasets: [{ 
          label: 'Ventas ($)', 
          data: [450, 920, 600, 550, 950, 720], 
          backgroundColor: '#d4af37',
          borderRadius: 5
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  private createDonutChart() {
    return new Chart(this.categoryChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Cortes', 'Vinos', 'Postres'],
        datasets: [{ 
          data: [60, 25, 15], 
          backgroundColor: ['#d4af37', '#ffffff', '#333333'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  private createRadarChart() {
    return new Chart(this.efficiencyChart.nativeElement, {
      type: 'radar',
      data: {
        labels: ['Cocina', 'Servicio', 'Limpieza', 'Sabor', 'Ambiente'],
        datasets: [{
          label: 'Rendimiento %',
          data: [90, 85, 95, 100, 80],
          borderColor: '#d4af37',
          backgroundColor: 'rgba(212, 175, 55, 0.2)',
          pointBackgroundColor: '#d4af37'
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100 } }
      }
    });
  }

  public generatePDF() {
    this.reportDate = new Date().toLocaleString();
    this.cdr.detectChanges();
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
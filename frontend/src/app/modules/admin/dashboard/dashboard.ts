import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private chartInstances: Chart[] = []; // Para limpiar memoria

  @ViewChild('salesChart') salesChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('forecastChart') forecastChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('efficiencyChart') efficiencyChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('loyaltyChart') loyaltyChart!: ElementRef<HTMLCanvasElement>;

  public metrics = {
    ingresosDia: 12540.50,
    ocupacionActual: 65,
    ticketPromedio: 850.00,
    tiempoPromedioMesa: '45 min'
  };

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Usamos un pequeño delay para asegurar que el CSS terminó de acomodar el layout
      setTimeout(() => {
        this.renderAllCharts();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    // Destruimos las gráficas al salir para que no consuman RAM ni bloqueen el scroll
    this.chartInstances.forEach(chart => chart.destroy());
  }

  private renderAllCharts() {
    this.chartInstances.push(this.createBarChart());
    this.chartInstances.push(this.createDonutChart());
    this.chartInstances.push(this.createLineChart());
    this.chartInstances.push(this.createRadarChart());
    this.chartInstances.push(this.createAreaChart());
  }

  // Helper para crear gráficas con la misma base de configuración
  private createBarChart() {
    return new Chart(this.salesChart.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
        datasets: [{ label: 'Ventas', data: [12000, 15000, 18000, 11000, 19000, 24000, 22000], backgroundColor: '#d4af37', borderRadius: 5 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  private createDonutChart() {
    return new Chart(this.categoryChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Cortes', 'Vinos', 'Bebidas', 'Postres'],
        datasets: [{ data: [45, 25, 20, 10], backgroundColor: ['#d4af37', '#00bfff', '#ffaa00', '#4caf50'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  private createLineChart() {
    return new Chart(this.forecastChart.nativeElement, {
      type: 'line',
      data: {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        datasets: [{ label: 'Proyección', data: [50, 75, 60, 90], borderColor: '#d4af37', tension: 0.4, fill: true, backgroundColor: 'rgba(212, 175, 55, 0.1)' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  private createRadarChart() {
    return new Chart(this.efficiencyChart.nativeElement, {
      type: 'radar',
      data: {
        labels: ['Cocina', 'Servicio', 'Limpieza', 'Sabor', 'Ambiente'],
        datasets: [
          {
            label: 'Planta Baja',
            data: [90, 85, 95, 100, 80],
            borderColor: '#d4af37', // Dorado
            backgroundColor: 'rgba(212, 175, 55, 0.2)',
            pointBackgroundColor: '#d4af37'
          },
          {
            label: 'Terraza',
            data: [70, 95, 80, 100, 100],
            borderColor: '#00bfff', // Azul
            backgroundColor: 'rgba(0, 191, 255, 0.2)',
            pointBackgroundColor: '#00bfff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#888', // Gris claro para la leyenda
              font: { size: 12 }
            }
          }
        },
        scales: {
          r: {
            // --- AQUÍ ESTÁ LA CORRECCIÓN DE LAS ETIQUETAS ---
            pointLabels: {
              color: '#d4af37', // Texto Dorado
              font: {
                size: 12,
                weight: 'bold'
              },
              // Esto elimina el fondo blanco por defecto
              backdropColor: 'transparent', 
              padding: 10
            },
            // Configuración de las líneas de la red
            grid: {
              color: 'rgba(255, 255, 255, 0.05)' // Líneas muy sutiles
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)' // Líneas de ángulo sutiles
            },
            // Configuración de los números de los ejes (70, 80, 90...)
            ticks: {
              color: '#444', // Gris oscuro
              backdropColor: 'transparent', // Sin fondo
              font: { size: 10 }
            },
            suggestedMin: 50,
            suggestedMax: 100
          }
        }
      }
    });
  }

  private createAreaChart() {
    return new Chart(this.loyaltyChart.nativeElement, {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          { label: 'Nuevos', data: [400, 450, 300, 500, 600, 550], borderColor: '#555', fill: false },
          { label: 'Recurrentes', data: [100, 150, 200, 250, 400, 500], borderColor: '#d4af37', fill: true, backgroundColor: 'rgba(212, 175, 55, 0.2)' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  public generatePDF() { alert("Reporte generado."); }
}
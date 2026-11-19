import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';
import { APP_CONFIG } from '../../core/constants/config';

@Component({
  selector: 'app-welcome-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="welcome-hero-hub">
      <div class="welcome-card-glow">
        <div class="gold-accent-bar"></div>
        <p class="pre-title">SISTEMA CORE DE INTELIGENCIA OPERATIVA</p>
        <h1>BIENVENIDO AL SISTEMA, <br><span class="gold-gradient-text">{{ nombreAdmin | uppercase }}</span></h1>
        <p class="current-date-text">{{ fechaActual | date:'fullDate' | uppercase }}</p>
        
        <div class="quick-status-row">
          <div class="mini-status-pill">
            <span class="val">{{ kpis.mesasActivas }}</span> <span class="lbl">Mesas en Servicio</span>
          </div>
          <div class="mini-status-pill">
            <span class="val">{{ kpis.ingresosTurno | currency }}</span> <span class="lbl">Balance Caja</span>
          </div>
          <div class="mini-status-pill">
            <span class="val">{{ kpis.ticketsCocina }}</span> <span class="lbl">Comandas en Cocina</span>
          </div>
        </div>
      </div>

      <div class="instruction-hint">
        <span class="material-icons animate-left-right">arrow_back</span>
        <p>Selecciona un módulo del panel lateral izquierdo para iniciar las operaciones.</p>
      </div>
    </div>
  `,
  styles: [`
    .welcome-hero-hub {
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 3rem; min-height: calc(100vh - 140px);
      background: radial-gradient(circle at center, #101010 0%, #050505 100%);
      animation: hubFadeIn 0.4s ease-out;
    }
    .welcome-card-glow {
      background: #0d0d0d; border: 1px solid #1c1c1c; border-radius: 12px;
      padding: 4rem 3.5rem; max-width: 750px; width: 100%; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
    }
    .gold-accent-bar { width: 60px; height: 2px; background: #cca43b; margin-bottom: 2rem; }
    .pre-title { color: #cca43b; font-size: 0.75rem; font-weight: 700; letter-spacing: 4px; margin-bottom: 0.5rem; }
    h1 { color: #fff; font-size: 2.4rem; font-weight: 200; line-height: 1.3; margin: 0 0 1rem; letter-spacing: 1px; }
    .gold-gradient-text { font-weight: 600; background: linear-gradient(45deg, #cca43b, #f3e5ab); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .current-date-text { color: #444; font-size: 0.75rem; letter-spacing: 2px; margin-bottom: 3.5rem; }
    .quick-status-row { display: flex; gap: 1.5rem; border-top: 1px dashed #222; padding-top: 2.5rem; }
    .mini-status-pill {
      flex: 1; background: #090909; border: 1px solid #181818; border-radius: 6px; padding: 1.2rem; display: flex; flex-direction: column;
    }
    .val { color: #cca43b; font-size: 1.5rem; font-weight: 700; font-family: monospace; }
    .lbl { color: #555; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; margin-top: 0.2rem; }
    .instruction-hint {
      display: flex; align-items: center; gap: 1rem; margin-top: 3.5rem; color: #444;
      span { font-size: 1.6rem; animation: arrowSwipe 2s infinite ease-in-out; }
      p { font-size: 0.85rem; font-weight: 500; margin: 0; letter-spacing: 0.5px; }
    }
    @keyframes hubFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes arrowSwipe { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-6px); } }
  `]
})
export class WelcomeHub implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  public fechaActual = new Date();
  public nombreAdmin: string = 'Administrador Principal';
  public kpis = { ingresosTurno: 0, mesasActivas: 0, ticketsCocina: 0 };

  ngOnInit() {
    const sessionUser = sessionStorage.getItem('current_user');
    if (sessionUser) {
      this.nombreAdmin = JSON.parse(sessionUser).nombre || 'Administrador Principal';
    }
    this.cargarMetricasHub();
  }

  async cargarMetricasHub() {
    try {
      const { count: ocupadas } = await this.supabaseSvc.supabase
        .from('Mesa')
        .select('*', { count: 'exact', head: true })
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .eq('estado', 'OCUPADA');
      this.kpis.mesasActivas = ocupadas || 0;

      const { data: ordenes } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('total')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .eq('estado', 'PAGADO');
      if (ordenes) {
        this.kpis.ingresosTurno = ordenes.reduce((acc, o) => acc + (o.total || 0), 0);
      }

      const { count: cocinaCount } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('*', { count: 'exact', head: true })
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .neq('estado', 'PAGADO');
      this.kpis.ticketsCocina = cocinaCount || 0;

      this.cdr.detectChanges();
    } catch (err) {
      console.error(err);
    }
  }
}
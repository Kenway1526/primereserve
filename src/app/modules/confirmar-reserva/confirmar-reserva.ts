import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase'; // 👈 Usaremos tu servicio limpio

@Component({
  selector: 'app-confirmar-reserva',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirmar-reserva.html',
  styleUrl: './confirmar-reserva.css'
})
export class ConfirmarReservaComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private supabaseSvc = inject(SupabaseService); // 👈 Reinyectamos tu servicio

  public isLoading = true;
  public titulo = 'Procesando...';
  public mensaje = 'Sincronizando asignación inteligente de mesas.';
  public error = false;

  // Extraemos el cliente que ya está configurado globalmente en tu app sin exponer llaves
  private get supabaseClient() {
    return (this.supabaseSvc as any).supabase || (this.supabaseSvc as any).client || this.supabaseSvc;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      const folio = params['folio']?.trim();
      const accion = params['accion']?.toUpperCase().trim();

      if (!folio || !accion) {
        this.mostrarError('Enlace incompleto.');
        return;
      }

      try {
        // Consulta limpia e inmune a cuelgues usando .limit(1)
        const { data: filas, error: fetchErr } = await this.supabaseClient
          .from('Reservacion')
          .select('id, numPersonas, estado, restauranteId, mesaId')
          .eq('folio', folio)
          .limit(1);

        if (fetchErr) throw fetchErr;

        if (!filas || filas.length === 0) {
          this.mostrarError(`No encontramos ninguna reservación activa con el folio: ${folio}`);
          return;
        }

        const reserva = filas[0];

        if (String(reserva.estado).toUpperCase() === 'CONFIRMADA') {
          this.titulo = 'Reservación ya Validada';
          this.mensaje = 'Esta asistencia ya se encuentra confirmada en nuestro sistema. ¡Te esperamos!';
          this.apagarLoader();
          return;
        }

        if (accion === 'CANCELAR') {
          await this.supabaseClient.from('Reservacion').update({ estado: 'CANCELADA' }).eq('id', reserva.id);
          this.titulo = 'Reserva Cancelada';
          this.mensaje = `Has cancelado tu reservación.`;
          this.apagarLoader();
          return;
        }

        if (accion === 'CONFIRMAR') {
          // Buscamos las mesas físicas
          const { data: mesas, error: mesasErr } = await this.supabaseClient
            .from('Mesa')
            .select('id, numeroMesa, capacidad, estado')
            .eq('restauranteId', reserva.restauranteId);

          if (mesasErr) throw mesasErr;

          const mesasDisponibles = (mesas || []).filter((m: any) => {
            const est = String(m.estado).toUpperCase();
            return (est === 'LIBRE' || est === 'DISPONIBLE') && m.capacidad >= reserva.numPersonas;
          });

          if (mesasDisponibles.length === 0) {
            this.titulo = 'Aforo Completo';
            this.mensaje = `No se encontraron mesas libres disponibles para ${reserva.numPersonas} personas. El restaurante te contactará.`;
            this.apagarLoader();
            return;
          }

          mesasDisponibles.sort((a: any, b: any) => a.capacidad - b.capacidad);
          const mesaIdeal = mesasDisponibles[0];

          // Amarre definitivo de la mesa
          const { error: errorReserva } = await this.supabaseClient
            .from('Reservacion')
            .update({ 
              estado: 'CONFIRMADA', 
              mesaId: mesaIdeal.id 
            })
            .eq('id', reserva.id);

          if (errorReserva) throw errorReserva;

          try {
            await this.supabaseClient.from('Mesa').update({ estado: 'RESERVADA' }).eq('id', mesaIdeal.id);
          } catch (e) {
            console.warn('Estado estético de mesa no cambiado, pero asignación completada.');
          }

          this.titulo = '¡Reserva Confirmada!';
          this.mensaje = `Tu asistencia ha sido validada. Se te ha asignado óptimamente la <b>Mesa número ${mesaIdeal.numeroMesa}</b> (Capacidad para ${mesaIdeal.capacidad} personas). ¡Tu espacio está garantizado!`;
        }

      } catch (err: any) {
        console.error('💥 Error en flujo:', err);
        this.mostrarError(`Inconveniente: ${err.message || 'Error de datos'}`);
      } finally {
        this.apagarLoader();
      }
    });
  }

  private mostrarError(msg: string) {
    this.titulo = '¡Vaya!';
    this.mensaje = msg;
    this.error = true;
    this.apagarLoader();
  }

  private apagarLoader() {
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 100);
  }
}
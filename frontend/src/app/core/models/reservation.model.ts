export interface Reservation {
  id: string; // gen_random_uuid()
  folio: string;
  fechaPrincipal: string; // timestamp
  horaPrincipal: string; // text
  fechaPlanB?: string;
  horaPlanB?: string;
  numPersonas: number; // integer (default 2)
  ocasion?: string;
  notasEspeciales?: string;
  estado: 'WAITLIST' | 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA'; // Según tu USER-DEFINED
  isWaitlistActive: boolean;
  posicionEspera?: number;
  restauranteId: string;
  mesaId?: string; // Para vincular con el Mapa de Mesas
  nombreInvitado: string;
  telefonoInvitado: string;
  emailInvitado: string;
  fechaRegistro?: string;
}
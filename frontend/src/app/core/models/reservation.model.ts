export interface Reservation {
  id?: string;
  primaryDate: string;
  primaryTime: string;
  alternativeDate: string; // Plan B obligatorio
  alternativeTime: string;
  people: number;
  occasion: string;
  requests: string;
  status: 'Pending' | 'Confirmed' | 'Waitlist' | 'Cancelled';
}
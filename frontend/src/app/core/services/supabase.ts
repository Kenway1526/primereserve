import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class Supabase {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      'https://uzeyiwrxccmfcalbuynr.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZXlpd3J4Y2NtZmNhbGJ1eW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI5NDgsImV4cCI6MjA4NjgzODk0OH0.g-if5J361k1PJA5keyXCL_guKJ-3UrQd_wU6-jxptQs'
    );
  }

  // Las funciones aquí devolverán datos que coinciden con tus modelos de Prisma
  async getMenu() {
    const { data, error } = await this.client
      .from('MenuItem')
      .select('*')
      .eq('isAvailable', true);
    return { data, error };
  }
}
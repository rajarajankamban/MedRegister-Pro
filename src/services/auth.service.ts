
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Explicitly type HttpClient to avoid 'unknown' type inference errors
  private readonly http: HttpClient = inject(HttpClient);
  private supabase: SupabaseClient | null = null;
  private _user = signal<User | null>(null);
  
  // States for configuration lifecycle
  isConfiguring = signal<boolean>(true);
  isConfigured = signal<boolean>(false);

  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._user());

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // 1. Fetch config from our Vercel backend bridge with explicit typing
      const config = await firstValueFrom(
        this.http.get<SupabaseConfig>('/api/config')
      );
      
      if (config && config.supabaseUrl && config.supabaseKey) {
        // 2. Initialize Supabase Client
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        
        // 3. Setup Auth Listeners
        const { data: { session } } = await this.supabase.auth.getSession();
        this._user.set(session?.user ?? null);

        this.supabase.auth.onAuthStateChange((_event, session) => {
          this._user.set(session?.user ?? null);
        });

        this.isConfigured.set(true);
      } else {
        console.error('Supabase config returned from API is incomplete.');
        this.isConfigured.set(false);
      }
    } catch (err) {
      console.error('Failed to fetch environment configuration:', err);
      this.isConfigured.set(false);
    } finally {
      this.isConfiguring.set(false);
    }
  }

  async signInWithGoogle() {
    if (!this.supabase) return;
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  async signOut() {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this._user.set(null);
  }

  getUserId(): string | undefined {
    return this._user()?.id;
  }

  getUserEmail(): string | undefined {
    return this._user()?.email;
  }
}

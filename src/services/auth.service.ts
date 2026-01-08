import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Conventionally, Vercel uses NEXT_PUBLIC_ prefix for browser-accessible variables
  // We check multiple possible locations for these variables
  private readonly supabaseUrl = 
    (window as any).process?.env?.SUPABASE_URL || 
    (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || 
    '';

  private readonly supabaseKey = 
    (window as any).process?.env?.SUPABASE_ANON_KEY || 
    (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    '';
  
  private supabase: SupabaseClient | null = null;
  private _user = signal<User | null>(null);
  
  // Track if the service is properly configured
  isConfigured = signal<boolean>(!!(this.supabaseUrl && this.supabaseKey));

  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._user());

  constructor() {
    if (this.isConfigured()) {
      try {
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // Check current session
        this.supabase.auth.getSession().then(({ data: { session } }) => {
          this._user.set(session?.user ?? null);
        });

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((_event, session) => {
          this._user.set(session?.user ?? null);
        });
      } catch (err) {
        console.error('Failed to initialize Supabase:', err);
        this.isConfigured.set(false);
      }
    } else {
      console.warn('Supabase credentials missing. Authentication will be disabled.');
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
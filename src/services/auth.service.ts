import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // In a real environment, these come from your build config or environment variables
  // For this environment, we assume they are available on the window object
  private readonly supabaseUrl = (window as any).process?.env?.SUPABASE_URL || '';
  private readonly supabaseKey = (window as any).process?.env?.SUPABASE_ANON_KEY || '';
  
  private supabase: SupabaseClient;
  private _user = signal<User | null>(null);

  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._user());

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    
    // Check current session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this._user.set(session?.user ?? null);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._user.set(session?.user ?? null);
    });
  }

  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Supabase will automatically use the Site URL configured in the dashboard
        // but we can be explicit if needed
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  async signOut() {
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
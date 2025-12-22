import { supabase } from './supabase';
import { mapSupabaseUser } from '@/stores/authStore';

class AuthService {
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async verifyOtpAndSetPassword(email: string, token: string, password: string, username: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username },
    });
    if (updateError) throw updateError;
    
    return data.user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  mapUser(user: any) {
    return mapSupabaseUser(user);
  }
}

export const authService = new AuthService();

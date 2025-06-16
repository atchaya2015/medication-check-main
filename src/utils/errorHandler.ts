import { AuthApiError, PostgrestError } from '@supabase/supabase-js';
import { StorageError } from '@supabase/storage-js';

export class AppError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 *
 *
 * @param supabaseError 
 * @param defaultMessage 
 * @returns 
 */
export const handleSupabaseError = (
  
  supabaseError: AuthApiError | PostgrestError | StorageError | null,
  defaultMessage: string
): AppError => {
  
  if (supabaseError && typeof supabaseError.message === 'string') {
    
    return new AppError(supabaseError.message, supabaseError);
  } else {

    return new AppError(defaultMessage, supabaseError);
  }
};
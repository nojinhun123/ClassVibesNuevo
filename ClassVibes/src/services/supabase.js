import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bxoellpcrejyiosyrvgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4b2VsbHBjcmVqeWlvc3lydmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDA5NjgsImV4cCI6MjA2NDE3Njk2OH0.FOFHrCWzzQR8GpE5445PPn-BQAuucvpAn_M0ecFPaE4';
export const supabase = createClient(supabaseUrl, supabaseKey);

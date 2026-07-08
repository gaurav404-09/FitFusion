-- Add productivity column to user_wellness_data table
ALTER TABLE public.user_wellness_data 
ADD COLUMN IF NOT EXISTS productivity INTEGER;

-- Also add other potentially missing columns
ALTER TABLE public.user_wellness_data 
ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;

ALTER TABLE public.user_wellness_data 
ADD COLUMN IF NOT EXISTS screen_time_hours FLOAT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_wellness_data';


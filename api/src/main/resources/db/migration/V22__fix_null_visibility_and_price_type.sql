UPDATE public.courses SET visibility = 'PUBLIC' WHERE visibility IS NULL;
UPDATE public.courses SET price_type = 'FREE' WHERE price_type IS NULL;

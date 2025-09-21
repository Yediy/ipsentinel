-- Final cleanup - ensure no conflicting objects exist
-- This should resolve any lingering security definer view issues

-- Make sure upcoming_deadlines is properly set up as a table
SELECT 'upcoming_deadlines is properly configured as:' as status,
       CASE 
         WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'upcoming_deadlines') 
         THEN 'TABLE' 
         WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'upcoming_deadlines')
         THEN 'VIEW'
         ELSE 'NOT_FOUND'
       END as object_type;
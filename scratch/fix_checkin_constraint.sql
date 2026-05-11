DO $$ 
BEGIN 
    -- Try to find and drop any unique constraints on DailyWorkLog
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = '"DailyWorkLog"'::regclass 
            AND contype IN ('u', 'p')
        ) LOOP
            EXECUTE 'ALTER TABLE "DailyWorkLog" DROP CONSTRAINT "' || r.conname || '"';
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping constraints: %', SQLERRM;
    END;

    -- Add the new unique constraint
    ALTER TABLE "DailyWorkLog" ADD CONSTRAINT "DailyWorkLog_unique_report_date" UNIQUE ("DamageReportID", "WorkDate");
END $$;

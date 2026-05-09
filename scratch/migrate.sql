
UPDATE "DamageReport"
SET "DamageContent" = regexp_replace(
  "DamageContent", 
  '^Bảo trì định kỳ: (.*?) \[Batch: (.*?)\]$', 
  '\1 - \2'
)
WHERE "DamageContent" ~ '^Bảo trì định kỳ: .* \[Batch: .*\]$';

UPDATE "Notification"
SET "Content" = regexp_replace(
  "Content", 
  'Bảo trì định kỳ: (.*?) \[Batch: (.*?)\]', 
  '\1 - \2',
  'g'
)
WHERE "Content" ~ 'Bảo trì định kỳ: .* \[Batch: .*\]';

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 10));
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);

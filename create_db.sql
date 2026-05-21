SELECT 'CREATE DATABASE gram_surya_darshan'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ts_gram_surya_darshan')\gexec

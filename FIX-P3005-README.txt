If you see "Error: P3005" and "The database schema is not empty":

  DO NOT use "migrate deploy". Use "db push" instead.

In a terminal, run:

  cd "d:\Lamp Projects\DMS\Pharma-DMS\documentmgmt-backend"
  npx prisma db push

Or double-click:  sync-database.bat

(Never run "npm run db:migrate" for this database - it causes P3005.)

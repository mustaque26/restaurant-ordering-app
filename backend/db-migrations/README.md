Instructions: applying DB migration to add tenant_id to menu_items

1. H2 (file-based) dev DB
   - Stop the backend if it's running.
   - From the backend folder, run the H2 console or use the H2 CLI to execute the SQL:

     psql/h2-cli or the simple approach:

     java -cp "$(dirname $(which mvn))/../lib/*" org.h2.tools.RunScript -url jdbc:h2:./data/restaurantdb -user sa -script db-migrations/001-add-tenantid-menuitems.sql

   - Alternatively, open the H2 console (web UI) and run the SQL there:
     - URL: jdbc:h2:./data/restaurantdb
     - Run the contents of `001-add-tenantid-menuitems.sql`.

2. PostgreSQL / MySQL / Production DB
   - Run the SQL in your DB migration tooling (Flyway, Liquibase) or via CLI:
     - Example (Postgres): psql -h host -U user -d dbname -f backend/db-migrations/001-add-tenantid-menuitems.sql

3. After applying migration
   - Restart the backend (if running). Verify the schema change; existing data will have tenant_id = NULL.
   - You may optionally update `backend/src/main/resources/data.sql` (already updated) if you want the default dataset with tenant_id columns for fresh DB creation.

If you'd like, I can add Flyway support and a migration file under `src/main/resources/db/migration` so migrations are applied automatically on startup.

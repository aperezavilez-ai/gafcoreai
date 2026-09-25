# GAFCORE Ecosystem & Infrastructure Guidelines

## ⚠️ CRITICAL RULE FOR AI
**DO NOT use official Supabase Cloud (`https://*.supabase.co`).**
All projects in this workspace use the **GAFCORE Self-Hosted Ecosystem ($0/month)**.

* **Public Supabase URL:** `https://supabase.gafcore.com`
* **Local Kong API:** `http://127.0.0.1:54321`
* **Direct PostgreSQL:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
* **Supabase Studio UI:** `http://localhost:54323`
* **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
* **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

### Project Structure:
1. Every project must have a `project-infra.json` specifying its dedicated database schema.
2. Store SQL migrations in `supabase/migrations/`.
3. Apply SQL migrations into the dedicated schema in the local Postgres instance.

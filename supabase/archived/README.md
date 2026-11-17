# Archived manual SQL scripts

The duplicate archived manual scripts were removed. The canonical SQL is in `../migrations/AUTH`.
Supabase's migration runner only discovers files directly under `../migrations`, so files in `AUTH`
must be applied through a workflow that explicitly reads that folder.

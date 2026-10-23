// TODO: prob better to use an ORM instead of having to write raw sql....
// else do a barrel export to save effort
export const testConnection = `
    SELECT
        current_database() AS database,
        extname AS extension
    FROM pg_extension
    WHERE extname = 'vector'
`
export function getDB(env) {
  if (!env.DB) throw new Error('D1 binding "DB" is missing.');
  return env.DB;
}

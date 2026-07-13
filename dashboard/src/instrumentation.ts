export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSyncScheduler } = await import('./lib/sync-scheduler');
    await initSyncScheduler();
  }
}

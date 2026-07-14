const DEFAULT_REPO = 'Calidad96/calidad-soc-stos-dashboard';
const WORKFLOW_FILE = 'sync-dashboard.yml';

function repoParts(): { owner: string; repo: string } {
  const full = process.env.GITHUB_REPO ?? DEFAULT_REPO;
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO must be owner/repo');
  return { owner, repo };
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function triggerGithubSync(): Promise<{
  triggered: boolean;
  message: string;
}> {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    return {
      triggered: false,
      message:
        'Server missing GITHUB_SYNC_TOKEN — add a GitHub PAT to Vercel env vars to enable one-click sync.',
    };
  }

  const { owner, repo } = repoParts();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify({ ref: 'main' }),
      cache: 'no-store',
    }
  );

  if (res.status === 204) {
    return {
      triggered: true,
      message:
        'Full sync started on GitHub. All 7 boards sync with no timeout — usually 10–20 minutes.',
    };
  }

  const body = await res.text();
  return {
    triggered: false,
    message: `Could not start GitHub sync (${res.status}): ${body.slice(0, 200)}`,
  };
}

export async function isGithubSyncRunning(): Promise<boolean> {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) return false;

  try {
    const { owner, repo } = repoParts();
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?status=in_progress&per_page=1`,
      { headers: githubHeaders(token), cache: 'no-store' }
    );
    if (!res.ok) return false;
    const json = (await res.json()) as { total_count?: number };
    return (json.total_count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function getLatestGithubSyncRun(): Promise<{
  status: string;
  conclusion: string | null;
  url: string | null;
  startedAt: string | null;
} | null> {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) return null;

  try {
    const { owner, repo } = repoParts();
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`,
      { headers: githubHeaders(token), cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      workflow_runs?: {
        status: string;
        conclusion: string | null;
        html_url: string;
        run_started_at: string;
      }[];
    };
    const run = json.workflow_runs?.[0];
    if (!run) return null;
    return {
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      startedAt: run.run_started_at,
    };
  } catch {
    return null;
  }
}

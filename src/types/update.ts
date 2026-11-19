export interface GitCommitSummary {
  sha: string;
  date: string;
  message: string;
}

export interface ReleaseNote {
  version: string;
  dateLabel: string;
  title: string;
  summary: string;
  highlights: string[];
}

export interface AppBuildInfo {
  version: string;
  buildId: string;
  commitSha: string;
  commitMessage: string;
  builtAt: string;
  recentCommits: GitCommitSummary[];
  releases?: ReleaseNote[];
}

export interface JustUpdatedRecord {
  fromBuildId: string;
  toBuildId: string;
  toVersion: string;
  commitSha: string;
  commitMessage: string;
  builtAt: string;
}

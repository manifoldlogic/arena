export default {
  repository: {
    mainBranch: "main",
  },
  worktree: {
    copyIgnoredFiles: [".env", ".env.local", ".claude/settings.json", ".claude/settings.local.json"],
    copyFromPath: '.',
    overwriteStrategy: 'skip'
  },
  launch: {
    askToUpdateLlmGuides: false
  },
  terminal: {
    backend: 'iterm',
    iterm: {
      sessionName: 'arena'
    }
  },
  evaluation: {
    autoMergeThreshold: 0.95,
    requireTestsPass: true,
    requireReview: true
  }
};

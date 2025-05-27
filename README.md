# try-module-action

A GitHub Action that publishes packages to [try-module.cloud](https://try-module.cloud) and automatically manages a single PR comment with installation instructions for all published packages.

## Features

- 📦 Publish packages by calling the action multiple times
- 💬 Automatically creates and updates a single PR comment listing all packages
- 🚀 Provides multiple installation options (commit, branch, PR number)

## Usage

Call the action once for each package you want to publish:

```yaml
name: Publish to try-module.cloud
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Publish core package
        uses: your-org/try-module-action@v1
        with:
          directory: "packages/core"
          organization: "your-org"
          secret: ${{ secrets.TRY_MODULE_SECRET }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Publish utils package
        uses: your-org/try-module-action@v1
        with:
          directory: "packages/utils"
          organization: "your-org"
          secret: ${{ secrets.TRY_MODULE_SECRET }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Publish UI package
        uses: your-org/try-module-action@v1
        with:
          directory: "packages/ui"
          organization: "your-org"
          secret: ${{ secrets.TRY_MODULE_SECRET }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `directory` | Path to your module | Yes |
| `organization` | Organization name on try-module.cloud | Yes |
| `secret` | Secret key for try-module.cloud | Yes |
| `github-token` | GitHub token for commenting on PRs | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `url_commit` | URL of the published module for commit |
| `url_branch` | URL of the published module for branch |
| `url_pr` | URL of the published module for PR |
| `command` | Command to install the published module |

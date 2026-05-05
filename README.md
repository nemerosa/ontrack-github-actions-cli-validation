# Ontrack GitHub actions: CLI validation

GitHub action to create a [validation run](https://nemerosa.github.io/ontrack/) in [Yontrack](https://github.com/nemerosa/ontrack-cli) for an existing build, using the Yontrack CLI.

## Prerequisites

The Yontrack CLI must be installed and configured on the runner. The recommended setup is to run [`ontrack-github-actions-cli-config`](https://github.com/nemerosa/ontrack-github-actions-cli-config) earlier in the same job — it installs and configures the CLI and exports `YONTRACK_PROJECT_NAME`, `YONTRACK_BRANCH_NAME`, and `YONTRACK_BUILD_NAME` env vars that this action reads as fallbacks.

## Inputs

| Input | Required | Description                                                                                                                                     |
|---|---|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `validation` | yes | Name of the validation stamp to use for the validation run.                                                                                     |
| `status` | no | Status of the validation run (e.g. `PASSED`, `FAILED`). If omitted but `type`/`flags` are provided, Yontrack computes the status from the data. |
| `type` | no | Type of validation data, as supported by the Yontrack CLI (e.g. `tests`).                                                                       |
| `flags` | no | Additional CLI flags for the data type (e.g. `--passed 10 --failed 1`). Required if `type` is set.                                              |
| `project` | no | Project name in Yontrack. Defaults to `YONTRACK_PROJECT_NAME` env var, then to the GitHub repo name.                                            |
| `branch` | no | Branch name in Yontrack. Defaults to `YONTRACK_BRANCH_NAME` env var, then to the parsed Git ref.                                                |
| `build` | no | Build name in Yontrack. Defaults to `YONTRACK_BUILD_NAME` env var. Required (either input or env var).                                          |
| `executable` | no | Name of the Yontrack CLI executable. Defaults to `yontrack`.                                                                                |
| `logging` | no | Set to `true` for verbose logging. Defaults to `false`.                                                                                         |

## Outputs

None.

## Example usage

### Pass a status from the previous step's outcome

```yaml
- name: Run tests
  id: tests
  run: npm test

- name: Validate the build
  uses: nemerosa/ontrack-github-actions-cli-validation@v3
  with:
    validation: TESTS
    status: ${{ steps.tests.outcome == 'success' && 'PASSED' || 'FAILED' }}
```

### Validate even when an earlier step failed (use `!cancelled()`)

By default, GitHub Actions skips a step if any earlier step failed. To run a validation regardless of prior failures (so you can mark a stamp as `FAILED` when something broke), use `if: ${{ !cancelled() }}`:

```yaml
- name: Run tests
  id: tests
  run: npm test

- name: Validate the build
  if: ${{ !cancelled() }}
  uses: nemerosa/ontrack-github-actions-cli-validation@v3
  with:
    validation: TESTS
    status: ${{ steps.tests.outcome == 'success' && 'PASSED' || 'FAILED' }}
```

`!cancelled()` runs the step on success or failure, but skips it if the workflow run was cancelled by a user.

### Pass typed validation data

```yaml
- name: Validate test results
  if: ${{ !cancelled() }}
  uses: nemerosa/ontrack-github-actions-cli-validation@v3
  with:
    validation: TESTS
    type: tests
    flags: --passed 42 --failed 1 --skipped 3
```

When `type` is provided, Yontrack derives the status from the data (e.g. any failures → `FAILED`). You can also pass an explicit `status` to override.

### Use after `cli-config` (env-var fallback)

If a previous step ran [`cli-config`](https://github.com/nemerosa/ontrack-github-actions-cli-config), it sets `YONTRACK_*` env vars and you can omit `project`/`branch`/`build`:

```yaml
- name: Configure Yontrack
  uses: nemerosa/ontrack-github-actions-cli-config@v2
  env:
    YONTRACK_URL: ${{ vars.YONTRACK_URL }}
    YONTRACK_TOKEN: ${{ secrets.YONTRACK_TOKEN }}

- name: Run tests
  id: tests
  run: npm test

- name: Validate
  if: ${{ !cancelled() }}
  uses: nemerosa/ontrack-github-actions-cli-validation@v3
  with:
    validation: TESTS
    status: ${{ steps.tests.outcome == 'success' && 'PASSED' || 'FAILED' }}
```

## Building

Download the dependencies by running:

```bash
npm install
```

To build the distribution:

```bash
npm run build
```

This runs `node build.js`, which invokes esbuild with `esbuild-plugin-license` to produce `dist/index.js` (the bundle the action runner executes) and `dist/licenses.txt` (license attributions). To run lint, build, and tests in one go:

```bash
npm run all
```

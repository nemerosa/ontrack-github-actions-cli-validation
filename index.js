const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

(async () => {
    try {
        await setup();
    } catch (error) {
        core.setFailed(error.message);
    }
})();

async function setup() {
    // Required inputs
    const stepName = core.getInput("step-name")
    const validation = core.getInput("validation")
    const build = core.getInput("build")
    // Logging
    console.log(`Step name: ${stepName}`)
    console.log(`Validation: ${validation}`)
    console.log(`Build: ${build}`)
    // Getting information about the step to measure
    const duration = await computeStepDuration(stepName)
    console.log(`${stepName} step duration: ${duration} seconds`)
}

async function computeStepDuration(stepName) {
    const token = core.getInput("token")
    const octokit = github.getOctokit(token)

    // Gets the current workflow
    const runId = github.context.runId
    console.log(`Run ID: ${runId}`)
    console.log(`Job: ${github.context.job}`)

    const run = await octokit.actions.getWorkflowRun({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        run_id: runId
    });

    console.log(`Run: ${run}`)

    // TODO Gets the duration
    return 0
}
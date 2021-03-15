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
    const jobName = github.context.job
    console.log(`Run ID: ${runId}`)
    console.log(`Job: ${jobName.job}`)

    const run = await octokit.actions.listJobsForWorkflowRun({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        run_id: runId
    });

    // Looks for the job
    const job = run.data.jobs.find((item) => item.name === jobName);
    if (!job) {
        throw `Job not found in current workflow: ${jobName}`
    }

    // Looks for the step
    const step = job.steps.find((item) => item.name === stepName);
    if (!step) {
        throw `Step not found in current job: ${stepName}`
    }

    // Step information
    const status = step.status
    const conclusion = step.conclusion
    const startedAt = new Date(step.started_at)
    const completedAt = new Date(step.completed_at)
    console.log(`Step status: ${status}`)
    console.log(`Step conclusion: ${conclusion}`)
    console.log(`Step started at: ${startedAt}`)
    console.log(`Step completed at: ${completedAt}`)

    // TODO Gets the duration
    return 0
}
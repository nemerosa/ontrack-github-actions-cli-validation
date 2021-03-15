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

    // Gets the step after it's been completed
    const step = getCompletedStep(octokit, stepName)

    // Step information
    const status = step.status
    const conclusion = step.conclusion
    const startedAt = new Date(step.started_at)
    const completedAt = new Date(step.completed_at)
    console.log(`Step status: ${status}`)
    console.log(`Step conclusion: ${conclusion}`)
    console.log(`Step started at: ${startedAt}`)
    console.log(`Step completed at: ${completedAt}`)

    // Gets the duration
    return (completedAt - startedAt) / 1000
}

function getCompletedStep(octokit, stepName) {
    const start = new Date()
    const timeoutMs = 10000

    return new Promise((resolve, reject) => {
        const wait = setInterval(function () {
            console.log(`Fetching step status: ${stepName}`)
            const step = getStep(octokit, stepName)
            console.log(`Step status: ${step.status}`)
            if (step.status === 'completed') {
                console.log(`Step is completed: ${stepName}`)
                clearInterval(wait);
                resolve(step);
            } else if (new Date() - start > timeoutMs) {
                clearInterval(wait);
                reject(`Timeout waiting for step ${stepName} to be completed`);
            }
        }, 20);
    });
}

async function getStep(octokit, stepName) {
    const run = await octokit.actions.listJobsForWorkflowRun({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        run_id: github.context.runId
    });

    // Looks for the job
    const job = run.data.jobs.find((item) => item.name === github.context.job);
    if (!job) {
        throw `Job not found in current workflow: ${jobName}`
    }

    // Looks for the step
    const step = job.steps.find((item) => item.name === stepName);
    if (!step) {
        throw `Step not found in current job: ${stepName}`
    }

    // OK
    return step
}
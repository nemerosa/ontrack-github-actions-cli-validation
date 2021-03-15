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
    const logging = core.getInput("logging") === 'true' || core.getInput("logging") === true
    console.log(`Step name: ${stepName}`)
    console.log(`Validation: ${validation}`)
    console.log(`Build: ${build}`)
    // Getting information about the step to measure
    const info = await computeStepRunInfo(logging, stepName)
    console.log(`${stepName} step duration: ${info.duration} seconds`)
    console.log(`${stepName} step URL: ${info.url}`)
    console.log(`${stepName} step event: ${info.event}`)
}

async function computeStepRunInfo(logging, stepName) {
    const token = core.getInput("token")
    const octokit = github.getOctokit(token)

    // A bit of logging to follow things through
    console.log(`Run ID: ${github.context.runId}`)
    console.log(`Job name: ${github.context.job}`)

    // Gets the step after it's been completed
    const response = await getCompletedStep(logging, octokit, stepName)
    const job = response.job
    const step = response.step

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
    const duration = (completedAt - startedAt) / 1000

    // Job link
    const url = job.html_url

    // Final information
    return {
        duration,
        url,
        event: github.context.eventName
    }
}

function getCompletedStep(logging, octokit, stepName) {
    const start = new Date()
    const timeoutMs = 30000

    return new Promise((resolve, reject) => {
        const wait = setInterval(function () {
            if (logging) {
                console.log(`Fetching step status: ${stepName}`)
            }
            getStep(octokit, stepName)
                .then(response => {
                    if (logging) {
                        console.log("Step: ", response.step)
                        console.log(`Step status: ${response.step.status}`)
                    }
                    if (response.step.status === 'completed') {
                        if (logging) {
                            console.log(`Step is completed: ${stepName}`)
                        }
                        clearInterval(wait);
                        resolve(response);
                    } else if (new Date() - start > timeoutMs) {
                        clearInterval(wait);
                        reject(`Timeout waiting for step ${stepName} to be completed`)
                    }
                })
                .catch(reject)
        }, 2000);
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
    return {
        job,
        step
    }
}
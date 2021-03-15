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
}

async function runAction({ core, exec, github }) {
    const validation = core.getInput("validation");
    if (!validation) {
        throw new Error("validation input is required");
    }

    let project = core.getInput("project");
    if (!project) {
        project = process.env.YONTRACK_PROJECT_NAME;
    }
    if (!project) {
        project = github.context.repo.repo;
    }

    let branch = core.getInput("branch");
    if (!branch) {
        branch = process.env.YONTRACK_BRANCH_NAME;
    }
    if (!branch) {
        const branchPrefix = 'refs/heads/';
        if (github.context.ref.startsWith(branchPrefix)) {
            branch = github.context.ref.substring(branchPrefix.length);
        } else {
            throw new Error(`Ref not supported: ${github.context.ref}`);
        }
    }

    let build = core.getInput("build");
    if (!build) {
        build = process.env.YONTRACK_BUILD_NAME;
    }
    if (!build) {
        throw new Error("build input is required (or YONTRACK_BUILD_NAME env var must be set)");
    }

    const status = core.getInput("status");

    const dataType = core.getInput("type");
    const dataFlags = core.getInput("flags");
    if (dataFlags && !dataType) {
        throw new Error("Flags are provided without a data type.");
    }

    const loggingInput = core.getInput("logging");
    const logging = loggingInput === 'true' || loggingInput === true;
    if (logging) {
        console.log(`Project: ${project}`);
        console.log(`Branch: ${branch}`);
        console.log(`Build: ${build}`);
        console.log(`Validation: ${validation}`);
        console.log(`Status: ${status || '(none)'}`);
        console.log(`Data type: ${dataType || '(none)'}`);
        console.log(`Data flags: ${dataFlags || '(none)'}`);
    }

    const executable = core.getInput("executable") || 'ontrack-cli';
    const args = [
        "validate",
        "--project", project,
        "--branch", branch,
        "--build", build,
        "--validation", validation,
    ];

    if (status) {
        args.push("--status", status);
    }

    if (dataType) {
        args.push(dataType);
        if (dataFlags) {
            const flags = dataFlags.split(" ");
            args.push(...flags);
        }
    }

    if (logging) {
        console.log(`CLI ${executable} `, args);
    }

    await exec.exec(executable, args);
}

module.exports = { runAction };

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        const core = await import('@actions/core');
        const execDep = await import('@actions/exec');
        const github = await import('@actions/github');
        try {
            await runAction({ core, exec: execDep, github });
        } catch (error) {
            core.setFailed(error.message);
        }
    })();
}

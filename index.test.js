const { runAction } = require('./index');

function makeCore(inputs = {}) {
    return {
        getInput: jest.fn((name) => (name in inputs ? inputs[name] : '')),
        setOutput: jest.fn(),
        setFailed: jest.fn(),
    };
}

function makeExec() {
    return { exec: jest.fn().mockResolvedValue(0) };
}

function makeGithub({ repo = 'my-repo', owner = 'my-org', ref = 'refs/heads/main' } = {}) {
    return { context: { repo: { owner, repo }, ref } };
}

beforeEach(() => {
    delete process.env.YONTRACK_PROJECT_NAME;
    delete process.env.YONTRACK_BRANCH_NAME;
    delete process.env.YONTRACK_BUILD_NAME;
});

describe('runAction — required inputs', () => {
    test('throws when validation input is missing', async () => {
        const core = makeCore({ build: 'b1' });
        const execDep = makeExec();
        const github = makeGithub();
        await expect(runAction({ core, exec: execDep, github })).rejects.toThrow('validation input is required');
    });

    test('throws when build is missing and YONTRACK_BUILD_NAME is unset', async () => {
        const core = makeCore({ validation: 'BUILD' });
        const execDep = makeExec();
        const github = makeGithub();
        await expect(runAction({ core, exec: execDep, github })).rejects.toThrow('build input is required');
    });
});

describe('runAction — fallbacks', () => {
    test('uses YONTRACK_BUILD_NAME env when build input is empty', async () => {
        process.env.YONTRACK_BUILD_NAME = '99';
        const core = makeCore({ validation: 'BUILD' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--build', '99']));
    });

    test('uses YONTRACK_PROJECT_NAME env when project input is empty', async () => {
        process.env.YONTRACK_PROJECT_NAME = 'env-project';
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub({ repo: 'context-repo' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--project', 'env-project']));
    });

    test('falls back to repo name when neither input nor env var sets project', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub({ repo: 'context-repo' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--project', 'context-repo']));
    });

    test('uses YONTRACK_BRANCH_NAME env when branch input is empty', async () => {
        process.env.YONTRACK_BRANCH_NAME = 'env-branch';
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub({ ref: 'refs/heads/somewhere' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--branch', 'env-branch']));
    });

    test('parses branch from ref when neither input nor env var sets branch', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub({ ref: 'refs/heads/feature/foo' });
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--branch', 'feature/foo']));
    });

    test('throws on unsupported ref when no branch override and no env var', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub({ ref: 'refs/something-else/foo' });
        await expect(runAction({ core, exec: execDep, github })).rejects.toThrow('Ref not supported');
    });

    test('input project takes precedence over env var', async () => {
        process.env.YONTRACK_PROJECT_NAME = 'env-project';
        const core = makeCore({ validation: 'BUILD', build: '1', project: 'input-project' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--project', 'input-project']));
    });
});

describe('runAction — status pass-through', () => {
    test('appends --status when status is provided', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1', status: 'PASSED' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['--status', 'PASSED']));
    });

    test('does not append --status when input is empty', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        const callArgs = execDep.exec.mock.calls[0][1];
        expect(callArgs).not.toContain('--status');
    });
});

describe('runAction — validation data', () => {
    test('appends type as positional arg when provided', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1', type: 'tests' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        const callArgs = execDep.exec.mock.calls[0][1];
        expect(callArgs).toContain('tests');
    });

    test('splits flags on spaces and appends them after type', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1', type: 'tests', flags: '--passed 10 --failed 1' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining(['tests', '--passed', '10', '--failed', '1']));
    });

    test('throws when flags are provided without type', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1', flags: '--passed 10' });
        const execDep = makeExec();
        const github = makeGithub();
        await expect(runAction({ core, exec: execDep, github })).rejects.toThrow('Flags are provided without a data type');
    });
});

describe('runAction — invocation contract', () => {
    test('uses the executable input', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1', executable: 'custom-cli' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('custom-cli', expect.any(Array));
    });

    test('defaults executable to ontrack-cli when input is empty', async () => {
        const core = makeCore({ validation: 'BUILD', build: '1' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.any(Array));
    });

    test('always includes validate, --project, --branch, --build, --validation in args', async () => {
        const core = makeCore({ validation: 'STAMP1', build: '7', project: 'p', branch: 'b' });
        const execDep = makeExec();
        const github = makeGithub();
        await runAction({ core, exec: execDep, github });
        expect(execDep.exec).toHaveBeenCalledWith('ontrack-cli', expect.arrayContaining([
            'validate',
            '--project', 'p',
            '--branch', 'b',
            '--build', '7',
            '--validation', 'STAMP1',
        ]));
    });
});

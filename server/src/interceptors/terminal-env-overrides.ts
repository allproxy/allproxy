import * as path from 'path';

import { APP_ROOT } from './constants';

const BIN_OVERRIDE_DIR = 'path';
const RUBY_OVERRIDE_DIR = 'gems';
const PHP_OVERRIDE_DIR = 'php';
const PYTHON_OVERRIDE_DIR = 'pythonpath';
const NODE_PREPEND_SCRIPT = ['js', 'prepend-node.js'];
const JAVA_AGENT_JAR = 'java-agent.jar';

export const OVERRIDES_DIR = path.join(APP_ROOT, 'overrides');

// Used in terminal scripts that help to enforce our PATH override elsewhere:
export const OVERRIDE_BIN_PATH = path.join(OVERRIDES_DIR, BIN_OVERRIDE_DIR);

// Use in attach-jvm to attach externally to a running JVM process:
export const OVERRIDE_JAVA_AGENT = path.join(OVERRIDES_DIR, JAVA_AGENT_JAR);

export function getTerminalEnvVars(
    proxyPort: number,
    httpsConfig: { certPath: string },
    currentEnv:
        | { [key: string]: string | undefined }
        | 'posix-runtime-inherit'
        | 'powershell-runtime-inherit',
    targetEnvConfig: {
        httpToolkitIp?: string,
        overridePath?: string,
        targetPlatform?: NodeJS.Platform
    } = {}
): { [key: string]: string } {
    const { overridePath, targetPlatform, httpToolkitIp } = {
        httpToolkitIp: '127.0.0.1',
        overridePath: OVERRIDES_DIR,
        targetPlatform: process.platform,
        ...targetEnvConfig
    };

    const runtimeInherit = currentEnv === 'posix-runtime-inherit'
        ? (varName: string) => `$${varName}`
        : currentEnv === 'powershell-runtime-inherit'
            ? ((varName: string) => `$env:${varName}`)
            : undefined;
    currentEnv = (runtimeInherit
        ? {} // Reset the env if we're using runtime inheritance:
        // Or use the real values we were given if not:
        : currentEnv
    ) as { [key: string]: string | undefined };

    const pathVarSeparator = targetPlatform === 'win32' ? ';' : ':';
    const joinPath = targetPlatform === 'win32' ? path.win32.join : path.posix.join;

    const proxyUrl = `http://${httpToolkitIp}:${proxyPort}`;

    const rubyGemsPath = joinPath(overridePath, RUBY_OVERRIDE_DIR);
    const pythonPath = joinPath(overridePath, PYTHON_OVERRIDE_DIR);
    const phpPath = joinPath(overridePath, PHP_OVERRIDE_DIR);
    const nodePrependScript = joinPath(overridePath, ...NODE_PREPEND_SCRIPT);
    const nodePrependOption = `--require ${
        // Avoid quoting except when necessary, because node 8 doesn't support quotes here
        nodePrependScript.includes(' ')
            ? `"${nodePrependScript}"`
            : nodePrependScript
        }`;

    const javaAgentOption = `-javaagent:"${joinPath(overridePath, JAVA_AGENT_JAR)
        }"=${httpToolkitIp}|${proxyPort}|${httpsConfig.certPath}`;

    const binPath = joinPath(overridePath, BIN_OVERRIDE_DIR);

    return {
        'http_proxy': proxyUrl,
        'HTTP_PROXY': proxyUrl,
        'https_proxy': proxyUrl,
        'HTTPS_PROXY': proxyUrl,
        // Used by global-agent to configure node.js HTTP(S) defaults
        'GLOBAL_AGENT_HTTP_PROXY': proxyUrl,
        // Used by some CGI engines to avoid 'httpoxy' vulnerability
        'CGI_HTTP_PROXY': proxyUrl,
        // Used by npm, for versions that don't support HTTP_PROXY etc
        'npm_config_proxy': proxyUrl,
        'npm_config_https_proxy': proxyUrl,
        // Stop npm warning about having a different 'node' in $PATH
        'npm_config_scripts_prepend_node_path': 'false',

        // Trust cert when using OpenSSL with default settings
        'SSL_CERT_FILE': httpsConfig.certPath,
        // Trust cert when using Node 7.3.0+
        'NODE_EXTRA_CA_CERTS': httpsConfig.certPath,
        // Trust cert when using Requests (Python)
        'REQUESTS_CA_BUNDLE': httpsConfig.certPath,
        // Trust cert when using Perl LWP
        'PERL_LWP_SSL_CA_FILE': httpsConfig.certPath,
        // Trust cert for HTTPS requests from Git
        'GIT_SSL_CAINFO': httpsConfig.certPath,
        // Trust cert in Rust's Cargo:
        'CARGO_HTTP_CAINFO': httpsConfig.certPath,
        // Trust cert in CURL (only required when not using OpenSSL):
        'CURL_CA_BUNDLE': httpsConfig.certPath,

        // Flag used by subprocesses to check they're running in an intercepted env
        'HTTP_TOOLKIT_ACTIVE': 'true',
        // Useful downstream to derive the raw paths elsewhere, e.g. in php.ini override config.
        'HTTP_TOOLKIT_OVERRIDE_PATH': overridePath,

        // Prepend our bin overrides into $PATH
        'PATH': `${binPath}${pathVarSeparator}${runtimeInherit ? runtimeInherit('PATH') : currentEnv.PATH
            }`,

        // Prepend our Ruby gem overrides into $LOAD_PATH
        'RUBYLIB': runtimeInherit
            ? `${rubyGemsPath}:${runtimeInherit('RUBYLIB')}`
            : !!currentEnv.RUBYLIB
                ? `${rubyGemsPath}:${currentEnv.RUBYLIB}`
                : rubyGemsPath,

        // Prepend our Python package overrides into $PYTHONPATH
        'PYTHONPATH': runtimeInherit
            ? `${pythonPath}:${runtimeInherit('PYTHONPATH')}`
            : currentEnv.PYTHONPATH
                ? `${pythonPath}:${currentEnv.PYTHONPATH}`
                : pythonPath,

        // We use $NODE_OPTIONS to prepend our script into node. Notably this drops existing
        // env values, when using our env, because _our_ NODE_OPTIONS aren't meant for
        // subprocesses. Otherwise e.g. --max-http-header-size breaks old Node/Electron.
        'NODE_OPTIONS': runtimeInherit
            ? `${runtimeInherit('NODE_OPTIONS')} ${nodePrependOption}`
            : nodePrependOption,

        // Attach our Java agent to all launched Java processes:
        'JAVA_TOOL_OPTIONS': runtimeInherit
            ? `${runtimeInherit('JAVA_TOOL_OPTIONS')} ${javaAgentOption}`
            : currentEnv.JAVA_TOOL_OPTIONS
                ? `${currentEnv.JAVA_TOOL_OPTIONS} ${javaAgentOption}`
                : javaAgentOption,

        'PHP_INI_SCAN_DIR': runtimeInherit
            ? `${runtimeInherit('PHP_INI_SCAN_DIR')}${pathVarSeparator}${phpPath}`
            : currentEnv.PHP_INI_SCAN_DIR
                ? `${currentEnv.PHP_INI_SCAN_DIR}${pathVarSeparator}${phpPath}`
                : phpPath,
    };
}
// Node.js core
const fs = require('fs').promises;
const os = require('os');

const path = require('path');

// External
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const gunzip = require('gunzip-file');

const REPO_BASE = 'https://vesio.azureedge.net/releases/vesctl/';

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch (arch) {
  const mappings = {
    x32: '386',
    x64: 'amd64'
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS (os) {
  const mappings = {
    win32: 'windows'
  };
  return mappings[os] || os;
}

async function downloadCLI (url) {
  core.debug(`Downloading Volterra CLI from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);
  const cliDir = path.dirname(pathToCLIZip);
  const pathToCLI = `${cliDir}/vesctl`;
  core.debug('Extracting Volterra CLI zip file');
  try {
    gunzip(pathToCLIZip, pathToCLI, () => {
      core.debug('gunzip done.');
    });
  } catch (e) {
    core.error('Unable to uncompress cli zip file.');
    throw e;
  }

  core.debug('Making vesctl binary executable.');
  await fs.chmod('vesctl', 0o755, (err) => {
    if (err) {
      core.error('Unable to add execute permissions on binary.');
      throw err;
    }
  });

  core.debug(`Volterra CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download vesctl from ${url}`);
  }

  return cliDir;
}

async function installWrapper (pathToCLI, platform, arch) {
  let source, target;

  // Move the vesctl binary out of the way so the wrapper can land.
  try {
    source = [pathToCLI, 'vesctl'].join(path.sep);
    target = [pathToCLI, 'vesctl-bin'].join(path.sep);
    core.debug(`Moving ${source} to ${target}.`);
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }

  // Install our wrapper as vesctl
  try {
    source = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
    target = [pathToCLI, 'vesctl'].join(path.sep);
    core.debug(`Copying ${source} to ${target}.`);
    await io.cp(source, target);
  } catch (e) {
    core.error(`Unable to copy ${source} to ${target}.`);
    throw e;
  }

  // Export a new environment variable, so our wrapper can locate the binary
  core.exportVariable('VOLTERRA_CLI_PATH', pathToCLI);
}

// Add credentials to CLI Configuration File
async function addCredentials (credentialsHostname, credentialsCertificate) {
  // format HCL block
  // eslint-disable
  const conf = `
server-urls: https://${credentialsHostname}/api"
p12-bundle: ${process.env.HOME}/vesctl-certificate-bundle.p12`.trim();
  // eslint-enable

  let confFile = `${process.env.HOME}/.vesconfig`;

  // override with VESCTL_CONFIG_FILE environment variable
  confFile = process.env.VESCTL_CONFIG_FILE ? process.env.VESCTL_CONFIG_FILE : confFile;

  // get containing folder
  const confFolder = path.dirname(confFile);

  core.debug(`Creating ${confFolder}`);
  await io.mkdirP(confFolder);

  core.debug(`Adding credentials to ${confFile}`);
  await fs.writeFile(confFile, conf);

  const credsFile = `${process.env.HOME}/vesctl-certificate-bundle.p12`;

  // get containing folder
  const credfFolder = path.dirname(credsFile);

  core.debug(`Creating ${credfFolder}`);
  await io.mkdirP(credfFolder);

  core.debug(`Adding credentials to ${credsFile}`);
  await fs.writeFile(credsFile, Buffer.from(credentialsCertificate, 'base64'));
}

function getUrl (version, platform, arch) {
  return `${REPO_BASE}${version}/vesctl.${platform}-${arch}.gz`;
}

async function run () {
  try {
    // Gather GitHub Actions inputs
    const version = core.getInput('vesctl_version');
    const credentialsHostname = core.getInput('cli_config_credential_hostname');
    const credentialsCertBundle = core.getInput('cli_config_credential_bundle');
    const wrapper = core.getInput('vesctl_wrapper') === 'true';

    // Gather OS details
    const osPlatform = os.platform();
    const osArch = os.arch();

    const platform = mapOS(osPlatform);
    const arch = mapArch(osArch);
    if (!['darwin', 'linux'].includes(platform) || !['amd64'].includes(arch)) {
      throw new Error(`Vesctl version ${version} not available for ${platform} and ${arch}`);
    }
    core.debug(`Getting url for vesctl version ${version}: ${platform} ${arch}`);
    const url = getUrl(version, platform, arch);

    // Download requested version
    const pathToCLI = await downloadCLI(url);

    // Install our wrapper
    if (wrapper) {
      await installWrapper(pathToCLI, platform, arch);
    }

    // Add to path
    core.addPath(pathToCLI);

    // Add credentials to file if they are provided
    if (credentialsHostname && credentialsCertBundle) {
      await addCredentials(credentialsHostname, credentialsCertBundle);
    }
    return true;
  } catch (error) {
    core.error(error);
    throw error;
  }
}

module.exports = run;

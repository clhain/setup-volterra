// Mock external modules by default
jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
// Mock Node.js core modules
jest.mock('os');

const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const io = require('@actions/io');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');

const setup = require('../lib/setup-volterra');

// Overwrite defaults
// core.debug = jest
//   .fn(console.log);
// core.error = jest
//   .fn(console.error);

describe('Setup Volterra', () => {
  const HOME = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = '/tmp/asdf';
  });

  afterEach(async () => {
    await io.rmRF(process.env.HOME);
    process.env.HOME = HOME;
  });

  test('gets specific version and adds certs and hostname on linux, amd64', async () => {
    const version = '0.1.1';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    const success = await setup();
    expect(success).toEqual(true);
    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
    // expect config are in ${HOME}.vesconfig
    const conf = await fs.readFile(`${process.env.HOME}/.vesconfig`, { encoding: 'utf8' });
    expect(conf.indexOf(credentialsHostname)).toBeGreaterThan(-1);
    const creds = await fs.readFile(`${process.env.HOME}/vesctl-certificate-bundle.p12`, { encoding: 'utf8' });
    expect(creds.indexOf('testing')).toBeGreaterThan(-1);
  });

  test('fails when specific version cannot be found', async () => {
    const version = '0.9.9';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken);

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when OS is windows', async () => {
    const version = '0.1.1';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('windows');

    os.arch = jest
      .fn()
      .mockReturnValue('windows');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI for os and architecture cannot be found', async () => {
    const version = '0.1.1';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('madeupplat');

    os.arch = jest
      .fn()
      .mockReturnValue('madeuparch');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI cannot be downloaded', async () => {
    const version = '0.1.1';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('installs wrapper on linux', async () => {
    const version = '0.1.1';
    const credentialsHostname = 'console.ves.volterra.io';
    const credentialsToken = 'dGVzdGluZw==';
    const wrapperPath = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));

    const ioMv = jest.spyOn(io, 'mv')
      .mockImplementation(() => {});
    const ioCp = jest.spyOn(io, 'cp')
      .mockImplementation(() => {});

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce(credentialsHostname)
      .mockReturnValueOnce(credentialsToken)
      .mockReturnValueOnce('true');

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file.zip');

    tc.extractZip = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    await setup();

    expect(ioMv).toHaveBeenCalledWith(`file${path.sep}vesctl.linux-amd64`, `file${path.sep}vesctl-bin`);
    expect(ioCp).toHaveBeenCalledWith(wrapperPath, `file${path.sep}vesctl`);
  });
});

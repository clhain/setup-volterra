# setup-volterra

<p align="left">
  <a href="https://github.com/hashicorp/setup-volterra/actions"><img alt="Continuous Integration" src="https://github.com/clhain/setup-volterra/workflows/Continuous%20Integration/badge.svg" /></a>
  <a href="https://github.com/hashicorp/setup-volterra/actions"><img alt="Setup Volterra" src="https://github.com/clhain/setup-volterra/workflows/Setup%20Volterra/badge.svg" /></a>
</p>

The `clhain/setup-volterra` action is a JavaScript action that sets up Volterra CLI (vesctl) in your GitHub Actions workflow by:

- Downloading a specific version of Vesctl CLI and adding it to the `PATH`.
- Configuring the [Vesctl CLI configuration file](https://gitlab.com/volterra.io/vesctl/blob/main/README.md) with a Volterra API endpoint and API credentials.
- Installing a wrapper script to wrap subsequent calls of the `vesctl` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively. (This can be optionally skipped if subsequent steps in the same job do not need to access the results of Vesctl commands.)

It's based on the awesome [Hashicorp setup-terraform action](https://github.com/hashicorp/setup-terraform).

After you've used the action, subsequent steps in the same job can run arbitrary Vesctl commands using [the GitHub Actions `run` syntax](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsrun). This allows most Vesctl commands to work exactly like they do on your local command line.

## Usage

This action can be run on `ubuntu-latest`, and `macos-latest` GitHub Actions runners.

The default configuration installs the latest version of Volterra Vesctl CLI and installs the wrapper script to wrap subsequent calls to the `vesctl` binary.

```yaml
steps:
- uses: clhain/setup-volterra@v1
```

A specific version of Volterra CLI can be installed.

```yaml
steps:
- uses: clhain/setup-volterra@v1
  with:
    vesctl_version: 0.2.24
```

Credentials for Vesctl can be configured.

```yaml
steps:
- uses: clhain/setup-volterra@v1
  with:
    cli_config_credential_bundle: ${{ secrets.TF_API_TOKEN }}
```

The wrapper script installation can be skipped.

```yaml
steps:
- uses: clhain/setup-volterra@v1
  with:
    vesctl_wrapper: false
```

Subsequent steps can access outputs when the wrapper script is installed.


```yaml
steps:
- uses: clhain/setup-volterra@v1

- run: vesctl configuration list namespaces

- run: echo ${{ steps.plan.outputs.stdout }}
- run: echo ${{ steps.plan.outputs.stderr }}
- run: echo ${{ steps.plan.outputs.exitcode }}
```

## Inputs

The action supports the following inputs:

- `cli_config_credential_hostname` - (optional) The hostname of the volterra api endpoint. Defaults to `console.ves.volterra.io`.

- `cli_config_credential_bundle` - (optional) A Base64 encoded Volterra API p12 bundle to use when interacting with the api.

- `vesctl_version` - (optional) The version of Vesctl CLI to install. If no version is given, it will default to `latest`.

- `vesctl_wrapper` - (optional) Whether to install a wrapper to wrap subsequent calls of 
   the `vesctl` binary and expose its STDOUT, STDERR, and exit code as outputs
   named `stdout`, `stderr`, and `exitcode` respectively. Defaults to `true`.


## Outputs

This action does not configure any outputs directly. However, when you set the `vesctl_wrapper` input
to `true`, the following outputs is available for subsequent steps that call the `vesctl` binary.

- `stdout` - The STDOUT stream of the call to the `vesctl` binary.

- `stderr` - The STDERR stream of the call to the `vesctl` binary.

- `exitcode` - The exit code of the call to the `vesctl` binary.

## License

[Mozilla Public License v2.0](https://github.com/clhain/setup-volterra/blob/master/LICENSE)

## Code of Conduct

[Code of Conduct](https://github.com/clhain/setup-volterra/blob/master/CODE_OF_CONDUCT.md)

## Experimental Status

By using the software in this repository (the "Software"), you acknowledge that: (1) the Software is still in development, may change, and has not been released as a commercial product by HashiCorp and is not currently supported in any way by HashiCorp; (2) the Software is provided on an "as-is" basis, and may include bugs, errors, or other issues;  (3) the Software is NOT INTENDED FOR PRODUCTION USE, use of the Software may result in unexpected results, loss of data, or other unexpected results, and HashiCorp disclaims any and all liability resulting from use of the Software; and (4) HashiCorp reserves all rights to make all decisions about the features, functionality and commercial release (or non-release) of the Software, at any time and without any obligation or liability whatsoever.

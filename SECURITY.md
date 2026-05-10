# Security Policy

ContextOps is local-first software that scans developer machine artifacts. Security and privacy reports are taken seriously.

## Supported Versions

The current developer preview is `0.1.x`. Security fixes will target the latest released version unless a broader patch is required.

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability involving sensitive local data, path disclosure, unsafe parsing, or secret exposure.

Report privately through GitHub Security Advisories for this repository. Include:

- affected version or commit
- operating system
- adapter or command involved
- reproduction steps using redacted or synthetic data
- expected and actual behavior

## Privacy Expectations

ContextOps should not upload local session data by default. Any issue that causes local logs, prompts, file paths, tokens, or database contents to leave the machine unexpectedly should be treated as security-sensitive.

## Parser Safety

Adapters should fail closed with warnings rather than crashes. Malformed logs, huge files, path traversal attempts, and unexpected encodings should not break scans or expose data outside configured local paths.

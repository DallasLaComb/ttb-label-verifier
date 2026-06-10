> Note: Using the existing "daltime" AWS account/profiles for convenience since they're already set up, given the one-week timeline for this prototype.

## Daily Login

One command authenticates all three profiles:

```bash
aws sso login --sso-session daltime
```

## Verify Access

```bash
aws sts get-caller-identity --profile daltime-dev
aws sts get-caller-identity --profile daltime-qa
aws sts get-caller-identity --profile daltime-prod
```
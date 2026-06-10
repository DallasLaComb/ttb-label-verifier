# IAM Setup for GitHub Actions OIDC

GitHub Actions authenticates with AWS using OpenID Connect (OIDC) - no static
access keys are stored in GitHub. Single environment ("main"), AWS account
**737780202102**, region **us-east-1**.

## 1. Create the OIDC Identity Provider (skip if it already exists)

This is account-wide, not repo-specific - if any other project (e.g. DalTime
dev) already set this up in account 737780202102, skip this step.

1. Go to **IAM > Identity providers > Add provider**
2. Select **OpenID Connect**
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Click **Get thumbprint**, then **Add provider**

Or via CLI:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## 2. Create the IAM Role

1. Go to **IAM > Roles > Create role**
2. Trusted entity type: **Web identity**
3. Identity provider: select the OIDC provider from step 1
4. Audience: `sts.amazonaws.com`
5. Skip the permissions step for now (attach the policy below after creation)
6. Name the role: `github-actions-ttb-label-verifier-main`

## 3. Set the Trust Policy

Replace the role's trust relationship with [`trust-policy.json`](trust-policy.json) -
it's already scoped to this repo and the `main` GitHub environment:

```bash
aws iam update-assume-role-policy \
  --role-name github-actions-ttb-label-verifier-main \
  --policy-document file://.github/iam/trust-policy.json
```

## 4. Attach the Permissions Policy

[`github-actions-policy.json`](github-actions-policy.json) is scoped to
`ttb-label-verifier-*` resources (plus `aws-sam-cli-managed-*` for SAM's
deployment bucket) in account 737780202102:

```bash
aws iam put-role-policy \
  --role-name github-actions-ttb-label-verifier-main \
  --policy-name ttb-label-verifier-deploy \
  --policy-document file://.github/iam/github-actions-policy.json
```

If a deploy fails with an access denied error, check which API call failed
and add only that action to the policy - it follows least-privilege.

## 5. Configure the GitHub Environment

In the GitHub repo: **Settings > Environments > New environment**, name it
`main` (must match `environment: main` in the workflows and the trust policy
subject `repo:DallasLaComb/ttb-label-verifier:environment:main`).

Add the following:

| Name | Type | Description |
|---|---|---|
| `AWS_ROLE_ARN` | Secret | `arn:aws:iam::737780202102:role/github-actions-ttb-label-verifier-main` |
| `AI_API_KEY` | Secret | Anthropic API key for the verify Lambda |
| `FRONTEND_BUCKET_NAME` | Variable | Globally-unique S3 bucket name, e.g. `ttb-label-verifier-frontend-737780202102` |

## 6. Deploy

Push to `main` (or run **Actions > Deploy > Run workflow**). This builds and
deploys `backend/template.yaml` - one stack containing the API Gateway,
Lambdas, and the S3/CloudFront frontend hosting - then builds the Angular
app, points it at the deployed API URL, and syncs it to S3/CloudFront.

The S3 bucket and CloudFront distribution are `DeletionPolicy: Retain`, so
redeploying (an `UpdateStack`) never tears down the live site or its CDN -
only an explicit removal of those resources from the template would.

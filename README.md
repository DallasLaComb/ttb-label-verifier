# ColaReady

AI-powered prototype for verifying alcohol beverage label artwork against COLA application data. Built for the Treasury take-home assessment — see [INSTRUCTIONS.md](INSTRUCTIONS.md) for the original project brief.

## Deadline

**Tuesday, June 16, 2026 — 8:00 AM**

## Tech Stack

- **Language:** TypeScript (frontend and backend)
- **Frontend:** Angular 21, Tailwind CSS
- **Backend:** AWS SAM (API Gateway, Lambda, Node.js 24 LTS / `nodejs24.x` runtime)
- **Data/Auth (as needed):** DynamoDB, AWS Cognito
- **Hosting:** S3 + CloudFront
- **CI/CD:** GitHub Actions
- **Quality gates:** SonarQube, Snyk
- **AI:** Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`) vision API for label field extraction — chosen for OCR accuracy on small print (government warnings, addresses); at this volume the cost difference vs. Haiku 4.5 is negligible (a few cents per check)

## Project Structure

```
frontend/   Angular + Tailwind app
backend/    AWS SAM project (API Gateway + Lambda + S3/CloudFront frontend hosting)
ai/prompts/ Reusable AI prompts (e.g. git commit messages)
```

## Local Development

### Prerequisites

- [Node.js 24 (LTS)](https://nodejs.org/) and npm
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Docker](https://www.docker.com/) (used by `sam local` to emulate the Lambda runtime)

### Setup

1. Copy `.env.example` to `.env` and fill in any values (e.g. `AI_API_KEY`).
2. In VS Code, run the **install and run all tasks** task (Terminal → Run Task → `install and run all tasks`). This installs both the frontend and backend dependencies, then starts:
   - Backend (SAM local API): http://localhost:3000
   - Frontend (Angular dev server): http://localhost:4200

### Manual setup (without VS Code tasks)

```bash
# Backend
cd backend
npm install
npm start   # builds with sam build, then sam local start-api on :3000

# Frontend (in a separate terminal)
cd frontend
npm install
npm start   # ng serve on :4200, configured to call http://localhost:3000
```

## API Testing (Bruno)

A [Bruno](https://www.usebruno.com/) collection for the backend API lives in
[backend/bruno/](backend/bruno/), with `local` (http://localhost:3000) and
`main` (deployed API) environments. Open the `backend/bruno/` folder in the
Bruno app to try the `/health` and `/verify` requests.

## CI/CD

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push
and on pull requests to `main`: type checks, unit tests, `npm audit`, a
CodeQL scan, `cfn-lint` + a soft-fail Checkov scan of the SAM template, and
builds the frontend and SAM application, uploading both as artifacts.

Deploy ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) runs on
push to `main`: it waits for CI to succeed on that commit, downloads the
frontend and SAM build artifacts CI produced (no rebuilding), and deploys
those exact builds to a single AWS environment (account `737780202102`,
region `us-east-1`). One CloudFormation stack (`backend/template.yaml`) holds
the API Gateway, Lambdas, and the S3/CloudFront frontend hosting. See
[.github/iam/setup-guide.md](.github/iam/setup-guide.md) for one-time
OIDC/IAM setup.

## Project Board

MVP stories tracked at [github.com/users/DallasLaComb/projects/23](https://github.com/users/DallasLaComb/projects/23/views/1).

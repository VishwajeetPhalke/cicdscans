#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// Import pipeline stacks
import { CicdTestPipelineStack } from '../lib/cicd-test-pipeline-stack';
import { CicdProdPipelineStack } from '../lib/cicd-prod-pipeline-stack';

// cdk-nag for AWS security best practices
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

// Create the CDK App (root of the project)
const app = new cdk.App();

// Enable security compliance checks (non-blocking, warns you during synth)
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Common AWS environment for all stacks
const env = {
  account: '430058392451',   // <-- your AWS account number
  region: 'us-east-1'        // <-- your region
};

// ---------------------------------------------------------------------
// TEST Pipeline Stack
// Watches GitHub branch: `test`
// Includes: SAST (Semgrep), SCA (npm audit, Trivy), IaC (Checkov), DAST (ZAP)
// ---------------------------------------------------------------------
new CicdTestPipelineStack(app, 'CicdTestPipelineStack', {
  env: env
});

// ---------------------------------------------------------------------
// PROD Pipeline Stack
// Watches GitHub branch: `main`
// Only deploys after manual merge from test → main
// ---------------------------------------------------------------------
new CicdProdPipelineStack(app, 'CicdProdPipelineStack', {
  env: env
});
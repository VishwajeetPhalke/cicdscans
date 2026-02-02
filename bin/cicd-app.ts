#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// Import pipeline stacks
import { CicdTestPipelineStack } from '../lib/cicd-test-pipeline-stack';
import { CicdProdPipelineStack } from '../lib/cicd-prod-pipeline-stack';

// Create the CDK App
const app = new cdk.App();

// Common AWS environment for all stacks
const env = {
  account: '430058392451',   // <-- your AWS account
  region: 'us-east-1'        // <-- your region
};

// TEST Pipeline (watches `test` branch) – runs SAST/SCA/IaC + DAST, then deploys
new CicdTestPipelineStack(app, 'CicdTestPipelineStack', { env });

// PROD Pipeline (watches `main` branch) – deploys after you merge test -> main
new CicdProdPipelineStack(app, 'CicdProdPipelineStack', { env });
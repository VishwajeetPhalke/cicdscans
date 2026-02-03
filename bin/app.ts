#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CicdTestPipelineStack } from '../lib/cicdtestpipeline-stack';
import { CicdProdPipelineStack } from '../lib/cicdprodpipeline-stack';

const app = new cdk.App();

// Deploy both pipelines (TEST and PROD)
new CicdTestPipelineStack(app, 'CicdTestPipelineStack', {
  env: { account: '430058392451', region: 'us-east-1' },
});

new CicdProdPipelineStack(app, 'CicdProdPipelineStack', {
  env: { account: '430058392451', region: 'us-east-1' },
});
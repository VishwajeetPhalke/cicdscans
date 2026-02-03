import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { lambdaStack } from './lambda-stack';

export class PipelineAppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    // Add your app stacks for this environment
    new lambdaStack(this, 'lambdastack', { env: props?.env });
  }
}
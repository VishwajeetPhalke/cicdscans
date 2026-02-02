import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from './lambda-stack';

export class PipelineAppStage extends cdk.Stage {
  public readonly apiUrlOutput: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const app = new LambdaStack(this, 'LambdaStack', {
      env: props?.env
    });

    // Re-expose for pipeline consumption
    this.apiUrlOutput = app.apiUrlOutput;
  }
}

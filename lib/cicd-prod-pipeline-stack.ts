import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep
  // ManualApprovalStep,
  // CodeBuildStep
} from 'aws-cdk-lib/pipelines';
import { PipelineAppStage } from './cicdpipelinestage-stack';

export class CicdProdPipelineStack extends cdk.Stack {
  public static readonly PIPELINE_NAME = 'CICD-Pipeline-Prod';

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'ProdPipeline', {
      pipelineName: CicdProdPipelineStack.PIPELINE_NAME,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicdcostdash2', // <-- your GitHub repo
          'main',                           // <-- watches `main`
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529'
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    const prodApp = new PipelineAppStage(this, 'prod', {
      env: { account: this.account, region: this.region }
    });

    pipeline.addStage(prodApp);

    // Optional: manual approval before PROD
    // const prodStage = pipeline.addStage(prodApp);
    // prodStage.addPre(new ManualApprovalStep('ApproveProd', { comment: 'Approve to deploy to PROD' }));
  }
}
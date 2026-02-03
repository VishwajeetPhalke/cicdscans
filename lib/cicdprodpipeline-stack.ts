import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  // ManualApprovalStep, // <- uncomment if you want a human gate before prod
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
          'VishwajeetPhalke/cicdcostdash2', // GitHub repo
          'main',                            // Prod watches 'main'
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
            // triggerOnPush: true (default) → starts when you merge test → main
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // Deploy to PROD environment (no scans here, per your ask)
    pipeline.addStage(
      new PipelineAppStage(this, 'prod', {
        env: { account: '430058392451', region: 'us-east-1' },
      })
    );

    // If you want a manual approval before PROD later, uncomment below:
    // prodStage.addPre(new ManualApprovalStep('ApproveProd', { comment: 'Approve to deploy to PROD' }));
  }
}

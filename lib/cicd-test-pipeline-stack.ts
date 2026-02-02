import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  ManualApprovalStep,
  CodeBuildStep
} from 'aws-cdk-lib/pipelines';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

import { PipelineAppStage } from './cicdpipelinestage-stack';

export class CicdTestPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'TestPipeline', {
      pipelineName: 'CICD-Pipeline-Test',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicdcostdash2',
          'test',
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529'
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // --- SECURITY WAVE ---
    const securityWave = pipeline.addWave('SecurityChecks');

    securityWave.addPost(new CodeBuildStep('EnterpriseSecuritySuite', {
      commands: [
        'python3 -m pip install --upgrade pip',

        // SAST: Semgrep
        'pip install semgrep',
        'semgrep ci --metrics=off || true',

        // SCA: npm audit
        'npm ci',
        'npm audit --audit-level=high || true',

        // IaC: Checkov
        'pip install checkov',
        'checkov -d . || true',

        // IaC + Secrets + FS: Trivy
        'curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
        'trivy fs . --exit-code 0 --severity HIGH,CRITICAL || true',
        'trivy config . --exit-code 0 --severity HIGH,CRITICAL || true',
      ],
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      }
    }));

    // --- DEPLOY TO TEST ---
    const testApp = new PipelineAppStage(this, 'test', {
      env: { account: this.account, region: this.region },
    });
    const testStage = pipeline.addStage(testApp);

    // --- DAST (OWASP ZAP) ---
    testStage.addPost(new CodeBuildStep('DAST_ZAP_FullScan', {
      envFromCfnOutputs: {
        TARGET_URL: testApp.apiUrlOutput,
      },
      commands: [
        'echo "Running ZAP Full Scan on $TARGET_URL"',
        'apt-get update && apt-get install -y docker.io',
        'docker pull ghcr.io/zaproxy/zaproxy:stable',
        'docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t "$TARGET_URL" -m 5 -r zap_report.html || true',
      ],
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      primaryOutputDirectory: '.'
    }));

    // --- MANUAL APPROVAL ---
    testStage.addPost(new ManualApprovalStep('ApproveTest', {
      comment: 'Review security scan results before allowing TEST to finish.',
    }));
  }
}
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
  public static readonly PIPELINE_NAME = 'CICD-Pipeline-Test';

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'TestPipeline', {
      pipelineName: CicdTestPipelineStack.PIPELINE_NAME,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicdcostdash2', // <-- your GitHub repo
          'test',                           // <-- watches `test`
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529'
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // ----------------- CI Security Wave (SAST + SCA + IaC + Trivy) -----------------
    const securityWave = pipeline.addWave('SecurityChecks');

    securityWave.addPost(new CodeBuildStep('EnterpriseSecuritySuite', {
      commands: [
        // Ensure Python tooling is ready
        'python3 -m pip install --upgrade pip',

        // 1) SAST: Semgrep
        'pip install semgrep==1.*',
        // Registry rules; for stricter control you can specify configs with --config
        'semgrep ci --severity WARNING,ERROR --metrics=off || echo "Semgrep findings (demo)"',

        // 2) SCA: Dependency audit
        'npm ci',
        'npm audit --audit-level=high || echo "npm audit findings (demo)"',

        // 3) IaC: Checkov (scan repo & synthesized template)
        'pip install checkov==3.*',
        'checkov -d . --quiet || echo "Checkov findings (demo)"',
        'npx cdk synth > /tmp/template.yaml',
        'checkov -f /tmp/template.yaml --framework cloudformation --quiet || echo "Checkov CFN findings (demo)"',

        // 4) Trivy: file system & config scans (HIGH/CRITICAL)
        'curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
        'trivy fs . --severity HIGH,CRITICAL --exit-code 0 --skip-dirs node_modules || true',
        'trivy config . --severity HIGH,CRITICAL --exit-code 0 || true',

        // NOTE: If you had container images, you could also run:
        // trivy image <image:tag> --severity HIGH,CRITICAL --exit-code 0
      ],
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0
      },
      // You can also upload reports to S3 via artifacts (not required for demo)
    }));

    // ----------------- CD: Deploy TEST -----------------
    const testApp = new PipelineAppStage(this, 'test', {
      env: { account: this.account, region: this.region }
    });

    const testStage = pipeline.addStage(testApp);

    // ----------------- DAST: OWASP ZAP Full Scan (post-TEST) -----------------
    testStage.addPost(new CodeBuildStep('DAST_ZAP_FullScan', {
      envFromCfnOutputs: {
        TARGET_URL: testApp.apiUrlOutput, // pass API URL into the job
      },
      commands: [
        'echo "Starting ZAP Full Scan against $TARGET_URL"',

        // Docker is preinstalled on CodeBuild Standard images; enable Privileged mode below.
        'docker version || true',
        'docker pull ghcr.io/zaproxy/zaproxy:stable',

        // Full scan (includes spider + active scan). For demo, don’t fail build:
        // -m 5 = max 5 minutes for spider
        // Remove "|| true" to fail build on alerts.
        'docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t "$TARGET_URL" -m 5 -r zap_full_report.html || true',

        'echo "ZAP full scan finished. Report = zap_full_report.html"',
      ],
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true // required for Docker-in-Docker
      },
      primaryOutputDirectory: '.'
    }));

    // ----------------- Manual Approval Gate -----------------
    testStage.addPost(new ManualApprovalStep('ApproveTestIsGood', {
      comment: 'Review SAST/SCA/IaC & ZAP results, then approve to finish TEST.'
    }));
  }
}
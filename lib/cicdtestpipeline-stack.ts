// import * as cdk from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// import {
//   CodePipeline,
//   CodePipelineSource,
//   ShellStep,
//   ManualApprovalStep,
// } from 'aws-cdk-lib/pipelines';
// import { PipelineAppStage } from './cicdpipelinestage-stack';

// export class CicdTestPipelineStack extends cdk.Stack {
//   public static readonly PIPELINE_NAME = 'CICD-Pipeline-Test';

//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     const pipeline = new CodePipeline(this, 'TestPipeline', {
//       pipelineName: CicdTestPipelineStack.PIPELINE_NAME,
//       synth: new ShellStep('Synth', {
//         input: CodePipelineSource.connection(
//           'VishwajeetPhalke/cicdscans', // GitHub repo
//           'test',                           // Test watches 'test'
//           {
//             connectionArn:
//               'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
//             // triggerOnPush: true (default) → runs on ANY file change in 'test'
//           }
//         ),
//         commands: ['npm ci', 'npm run build', 'npx cdk synth'],
//       }),
//     });

//     // ===== Security & Quality (TEST ONLY) =====
//     // const securityChecks = new ShellStep('SecurityChecks', {
//     //   installCommands: [
//     //     // Install security tools locally into $PWD
//     //     'curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b .',
//     //     'curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | bash -s -- -b .',
//     //     'python3 -m pip install --upgrade pip',
//     //     'pip3 install semgrep',
//     //     'export PATH=$PWD:$PATH',
//     //   ],
//     //   commands: [
//     //     // 1) Code Quality
//     //     'npm ci',
//     //     'npm run lint',
//     //     'npm test -- --ci --runInBand',

//     //     // 2) SCA (dependency vulns)
//     //     'npm audit --audit-level=high || true', // warn for demo; tighten later


//     //     // 4) SAST
//     //     'semgrep ci --config p/ci --error --no-git',

//     //     // 5) Trivy filesystem (SCA + misconfig)
//     //     './trivy fs . --severity HIGH,CRITICAL --exit-code 1 --no-progress --ignorefile .trivyignore',
//     //   ],
//     // });
    

//     // Deploy to TEST environment
//     const testStage = pipeline.addStage(
//       new PipelineAppStage(this, 'test', {
//         env: { account: '430058392451', region: 'us-east-1' },
//       })
//     );

//     // Run scans BEFORE deploying to TEST
//     testStage.addPre(securityChecks);

//     // Manual approval at the end (pipeline shows SUCCEEDED after approval)
//     testStage.addPost(
//       new ManualApprovalStep('ApproveTestIsGood', {
//         comment:
//           'Approve if TEST is correct. Then manually merge test → main in GitHub to trigger the PROD pipeline.',
//       })
//     );
//   }
// }
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  ManualApprovalStep,
} from 'aws-cdk-lib/pipelines';
import { PipelineAppStage } from './cicdpipelinestage-stack';

export class CicdTestPipelineStack extends cdk.Stack {
  public static readonly PIPELINE_NAME = 'CICD-Pipeline-Test';

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'TestPipeline', {
      pipelineName: CicdTestPipelineStack.PIPELINE_NAME,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicdscans',
          'test',
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // ========================= SECURITY SCANS =========================
    const securityChecks = new ShellStep('SecurityChecksV4', {
      installCommands: [
        'set -eu',
        'echo "Installing Trivy + Semgrep..."',

        // Trivy install
        'curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b .',
        'mv ./trivy /usr/local/bin/trivy || true',
        'chmod +x /usr/local/bin/trivy || true',
        'trivy --version || true',

        // Install Semgrep
        'python3 -m pip install --upgrade pip',
        'pip3 install semgrep',
        'semgrep --version || true',

        'export PATH="/usr/local/bin:$PATH"',
      ],

      commands: [
        'npm ci',
        'npm run lint',
        'npm test -- --ci --runInBand',

        'npm audit --audit-level=high || true',

        // FIXED: Semgrep command (NO --error, NO --no-git)
        'semgrep ci --config p/ci',

        'trivy fs . --severity HIGH,CRITICAL --exit-code 1 --no-progress --ignorefile .trivyignore',
      ],
    });

    const testStage = pipeline.addStage(
      new PipelineAppStage(this, 'test', {
        env: { account: '430058392451', region: 'us-east-1' },
      })
    );

    testStage.addPre(securityChecks);

    testStage.addPost(
      new ManualApprovalStep('ApproveTestIsGood', {
        comment:
          'Approve if TEST is correct. Then merge test → main for PROD.',
      })
    );
  }
}
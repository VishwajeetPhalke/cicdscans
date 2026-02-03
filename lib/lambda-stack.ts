import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class lambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.Function(this, 'demolambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log("Hello from inline Lambda Vishwajeet (env:", process.env.ENV, ")");
          return { statusCode: 200, body: "Hello from inline Lambda and team" };
        };
      `),
      environment: {
        ENV: cdk.Stack.of(this).stackName,
      },
    });
  }
}
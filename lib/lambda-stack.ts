import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class LambdaStack extends cdk.Stack {
  public readonly apiUrlOutput: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'DemoLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return { statusCode: 200, body: "Hello from Lambda" };
        };
      `),
    });

    const api = new apigw.LambdaRestApi(this, 'DemoApi', {
      handler: fn,
      proxy: true,
    });

    this.apiUrlOutput = new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
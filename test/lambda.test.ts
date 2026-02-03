import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { lambdaStack } from '../lib/lambda-stack';

test('Lambda function created', () => {
  const app = new App();
  const stack = new lambdaStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Lambda::Function', 1);
});
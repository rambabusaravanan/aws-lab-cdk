import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as MyappCdk from '../lib/myapp-cdk-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new MyappCdk.MyappCdkStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

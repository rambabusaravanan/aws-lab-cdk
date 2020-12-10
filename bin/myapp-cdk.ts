#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MyappCdkStack } from '../lib/myapp-cdk-stack';

const app = new cdk.App();
new MyappCdkStack(app, 'MyappCdkStack');

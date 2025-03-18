#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../lib/core-stack';
import { IsrStack } from '../lib/isr-stack';
import { WarmerStack } from '../lib/warmer-stack';
import { CloudWatchStack } from '../lib/cloudwatch-stack';

const app = new cdk.App();

// 部署环境
const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
};

// 应用名称和环境（用于资源命名）
const appName = 'NextJsAwsDemo';
const stage = 'dev';

// 部署核心堆栈
const coreStack = new CoreStack(app, `${appName}-Core-${stage}`, {
    env,
    appName,
    stage,
  });
  
  // 部署ISR堆栈，依赖核心堆栈
  const isrStack = new IsrStack(app, `${appName}-ISR-${stage}`, {
    env,
    appName,
    stage,
    coreResources: coreStack.coreResources,
  });
  
  // 部署预热器堆栈，依赖核心堆栈和ISR堆栈
  const warmerStack = new WarmerStack(app, `${appName}-Warmer-${stage}`, {
    env,
    appName,
    stage,
    coreResources: coreStack.coreResources,
    isrResources: isrStack.isrResources,
  });

  // 部署CloudWatch堆栈，依赖所有其他堆栈
new CloudWatchStack(app, `${appName}-CloudWatch-${stage}`, {
    env,
    appName,
    stage,
    coreResources: coreStack.coreResources,
    isrResources: isrStack.isrResources,
    warmerResources: warmerStack.warmerResources,
  });
  
// 添加标签
cdk.Tags.of(app).add('Project', appName);
cdk.Tags.of(app).add('Environment', stage);
  
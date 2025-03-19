import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

// 在lib/warmer-stack.ts中定义，负责保持Lambda函数温暖以减少冷启动时间：
// 1. 预热器Lambda函数
// 2. EventBridge规则 (用于定时触发预热)

interface WarmerStackProps extends cdk.StackProps {
  appName: string;
  stage: string;
  coreResources: {
    nextServerFunction: lambda.Function;
  };
  isrResources: {
    cacheBucket: cdk.aws_s3.Bucket;
  };
}

export class WarmerStack extends cdk.Stack {
  public readonly warmerResources: {
    warmerFunction: lambda.Function;
    eventBridge: events.Rule;
  };

  constructor(scope: Construct, id: string, props: WarmerStackProps) {
    super(scope, id, props);

    // 创建Lambda函数用于预热
    const warmerFunction = new lambda.Function(this, 'WarmerFunction', {
      functionName: `${props.appName}-Warmer-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/warmer')), // 自定义Lambda代码
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      environment: {
        FUNCTION_ARN: props.coreResources.nextServerFunction.functionArn,
        STAGE: props.stage,
      },
    });

    // 添加调用Lambda的权限
    warmerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [props.coreResources.nextServerFunction.functionArn],
      })
    );

    // 允许访问ISR缓存桶
    props.isrResources.cacheBucket.grantRead(warmerFunction);

    // 创建EventBridge规则，每5分钟触发一次
    const eventRule = new events.Rule(this, 'WarmerSchedule', {
      ruleName: `${props.appName}-WarmerSchedule-${props.stage}`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });

    // 添加Lambda函数作为目标
    eventRule.addTarget(new targets.LambdaFunction(warmerFunction, {
      retryAttempts: 2,
    }));

    // 存储资源引用以便其他堆栈使用
    this.warmerResources = {
      warmerFunction,
      eventBridge: eventRule,
    };

    // 输出值
    new cdk.CfnOutput(this, 'WarmerFunctionName', {
      value: warmerFunction.functionName,
      description: 'Warmer Lambda Function Name',
    });

    new cdk.CfnOutput(this, 'WarmerScheduleRuleName', {
      value: eventRule.ruleName,
      description: 'Warmer Schedule Rule Name',
    });
  }
}
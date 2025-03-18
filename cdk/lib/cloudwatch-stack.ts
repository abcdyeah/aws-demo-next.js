// cdk/lib/cloudwatch-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';

interface CloudWatchStackProps extends cdk.StackProps {
  appName: string;
  stage: string;
  coreResources: {
    nextServerFunction: lambda.Function;
    imageOptimizerFunction: lambda.Function;
    distribution: cdk.aws_cloudfront.Distribution;
  };
  isrResources: {
    revalidationFunction: lambda.Function;
  };
  warmerResources: {
    warmerFunction: lambda.Function;
  };
}

export class CloudWatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CloudWatchStackProps) {
    super(scope, id, props);

    // 创建SNS主题用于警报
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${props.appName}-Alarms-${props.stage}`,
    });

    // 添加SNS订阅（邮件通知）
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription('alerts@example.com') // 替换为实际的邮箱地址
    );

    // 创建CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${props.appName}-Dashboard-${props.stage}`,
    });

    // 添加Lambda函数监控
    const lambdaFunctions = [
      props.coreResources.nextServerFunction,
      props.coreResources.imageOptimizerFunction,
      props.isrResources.revalidationFunction,
      props.warmerResources.warmerFunction,
    ];

    // 为每个Lambda函数创建监控面板
    lambdaFunctions.forEach((func) => {
      // 创建错误警报
      const errorAlarm = new cloudwatch.Alarm(this, `${func.functionName}ErrorAlarm`, {
        alarmName: `${func.functionName}-Errors-${props.stage}`,
        metric: func.metricErrors(),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // 创建调用时间警报
      const durationAlarm = new cloudwatch.Alarm(this, `${func.functionName}DurationAlarm`, {
        alarmName: `${func.functionName}-Duration-${props.stage}`,
        metric: func.metricDuration(),
        threshold: 3000, // 3秒
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // 将警报添加到SNS主题
      errorAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
      durationAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));

      // 添加函数指标到控制面板
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: `${func.functionName} 调用和错误`,
          left: [func.metricInvocations(), func.metricErrors()],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: `${func.functionName} 持续时间`,
          left: [func.metricDuration()],
          width: 12,
        })
      );
    });

    // 添加CloudFront指标到控制面板
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront请求',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: {
              DistributionId: props.coreResources.distribution.distributionId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'CloudFront错误率',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '4xxErrorRate',
            dimensionsMap: {
              DistributionId: props.coreResources.distribution.distributionId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '5xxErrorRate',
            dimensionsMap: {
              DistributionId: props.coreResources.distribution.distributionId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      })
    );

    // 输出值
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });
  }
}
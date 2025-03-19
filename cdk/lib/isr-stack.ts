import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

// 在lib/isr-stack.ts中定义，处理Next.js的增量静态再生功能：
// 1. 缓存存储桶
// 2. 重新验证队列 (SQS)
// 3. 重新验证Lambda函数
// 4. 标签路径映射表 (DynamoDB)
interface IsrStackProps extends cdk.StackProps {
  appName: string;
  stage: string;
  coreResources: {
    assetBucket: s3.Bucket;
    nextServerFunction: lambda.Function;
    distribution: cdk.aws_cloudfront.Distribution;
  };
}

export class IsrStack extends cdk.Stack {
  public readonly isrResources: {
    cacheBucket: s3.Bucket;
    revalidationQueue: sqs.Queue;
    revalidationFunction: lambda.Function;
    tagPathMapping: dynamodb.Table;
  };

  constructor(scope: Construct, id: string, props: IsrStackProps) {
    super(scope, id, props);

    // 创建ISR缓存S3存储桶
    const cacheBucket = new s3.Bucket(this, 'CacheBucket', {
      bucketName: `${props.appName.toLowerCase()}-cache-${props.stage.toLowerCase()}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 仅用于开发环境
      autoDeleteObjects: true,  // 仅用于开发环境
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // 创建DynamoDB表用于标签到路径映射
    const tagPathMapping = new dynamodb.Table(this, 'TagPathMapping', {
      tableName: `${props.appName}-TagPathMapping-${props.stage}`,
      partitionKey: { name: 'tag', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'path', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 仅用于开发环境
    });

    // 创建SQS队列用于重新验证
    const revalidationQueue = new sqs.Queue(this, 'RevalidationQueue', {
      queueName: `${props.appName}-RevalidationQueue-${props.stage}`,
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(7),
    });

    // 创建Lambda函数用于重新验证
    const revalidationFunction = new lambda.Function(this, 'RevalidationFunction', {
      functionName: `${props.appName}-Revalidation-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/revalidation')), // 自定义Lambda代码
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CACHE_BUCKET_NAME: cacheBucket.bucketName,
        TAG_PATH_TABLE_NAME: tagPathMapping.tableName,
        STAGE: props.stage,
        DISTRIBUTION_ID: props.coreResources.distribution.distributionId,
      },
    });

    // 允许重新验证Lambda函数访问资源
    cacheBucket.grantReadWrite(revalidationFunction);
    tagPathMapping.grantReadWriteData(revalidationFunction);
    props.coreResources.nextServerFunction.grantInvoke(revalidationFunction);
    
    // 设置SQS队列触发Lambda
    revalidationFunction.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(revalidationQueue));

    // 存储资源引用以便其他堆栈使用
    this.isrResources = {
      cacheBucket,
      revalidationQueue,
      revalidationFunction,
      tagPathMapping
    };

    // 输出值
    new cdk.CfnOutput(this, 'CacheBucketName', {
      value: cacheBucket.bucketName,
      description: 'ISR Cache Bucket Name',
    });

    new cdk.CfnOutput(this, 'TagPathMappingTableName', {
      value: tagPathMapping.tableName,
      description: 'Tag to Path Mapping Table Name',
    });
  }
}

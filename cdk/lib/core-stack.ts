import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as path from 'path';

export interface CoreStackProps extends cdk.StackProps {
  appName: string;
  stage: string;
}

export class CoreStack extends cdk.Stack {
    public readonly coreResources: {
      assetBucket: s3.Bucket;
      distribution: cloudfront.Distribution;
      nextServerFunction: lambda.Function;
      imageOptimizerFunction: lambda.Function;
    };
  
    constructor(scope: Construct, id: string, props: CoreStackProps) {
      super(scope, id, props);
  
      // 创建静态资源S3存储桶
      const assetBucket = new s3.Bucket(this, 'AssetBucket', {
        bucketName: `${props.appName.toLowerCase()}-assets-${props.stage.toLowerCase()}-${this.account}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY, // 仅用于开发环境
        autoDeleteObjects: true,  // 仅用于开发环境
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
      });
  
      // 创建Next.js服务器Lambda函数
      const nextServerFunction = new lambda.Function(this, 'NextServerFunction', {
        functionName: `${props.appName}-NextServer-${props.stage}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../.next/server')), // 假设已经构建了Next.js应用
        memorySize: 1024,
        timeout: cdk.Duration.seconds(30),
        environment: {
          ASSET_BUCKET_NAME: assetBucket.bucketName,
          STAGE: props.stage,
        },
      });
  
      // 添加Function URL
      const nextServerFunctionUrl = nextServerFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
      });
  
      // 创建图像优化Lambda函数
      const imageOptimizerFunction = new lambda.Function(this, 'ImageOptimizerFunction', {
        functionName: `${props.appName}-ImageOptimizer-${props.stage}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../.next/server')), // 相同代码，不同处理器
        memorySize: 1024,
        timeout: cdk.Duration.seconds(30),
        environment: {
          ASSET_BUCKET_NAME: assetBucket.bucketName,
          STAGE: props.stage,
        },
      });
  
      // 添加Function URL
      const imageOptimizerFunctionUrl = imageOptimizerFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
      });
  
      // 允许Lambda函数访问S3
      assetBucket.grantReadWrite(nextServerFunction);
      assetBucket.grantReadWrite(imageOptimizerFunction);
  
      // 创建WAF Web ACL
      const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
        name: `${props.appName}-WebACL-${props.stage}`,
        defaultAction: { allow: {} },
        scope: 'CLOUDFRONT',
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `${props.appName}-WebACL-${props.stage}`,
          sampledRequestsEnabled: true,
        },
        rules: [
          {
            name: 'RateLimitRule',
            priority: 0,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 1000,
                aggregateKeyType: 'IP',
              },
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `${props.appName}-RateLimitRule-${props.stage}`,
              sampledRequestsEnabled: true,
            },
          },
        ],
      });
  
      // 创建Route 53 记录（示例，实际使用需要配置域名）
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: 'DUMMY_ZONE_ID', // 替换为实际的托管区域ID
        zoneName: 'example.com', // 替换为实际的域名
      });
  
      // 创建CloudFront分配
      const distribution = new cloudfront.Distribution(this, 'Distribution', {
        defaultBehavior: {
          origin: new origins.S3Origin(assetBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        additionalBehaviors: {
          '/_next/static/*': {
            origin: new origins.S3Origin(assetBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
          '/_next/image/*': {
            origin: new origins.HttpOrigin(imageOptimizerFunctionUrl.url),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
          '/api/*': {
            origin: new origins.HttpOrigin(nextServerFunctionUrl.url),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
          '/*': {
            origin: new origins.HttpOrigin(nextServerFunctionUrl.url),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
        },
        webAclId: webAcl.attrArn,
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 404,
            responsePagePath: '/404',
          },
          {
            httpStatus: 500,
            responseHttpStatus: 500,
            responsePagePath: '/500',
          },
        ],
      });
  
      // 存储资源引用以便其他堆栈使用
      this.coreResources = {
        assetBucket,
        distribution,
        nextServerFunction,
        imageOptimizerFunction
      };
  
      // 输出值
      new cdk.CfnOutput(this, 'DistributionDomainName', {
        value: distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name',
      });
  
      new cdk.CfnOutput(this, 'AssetBucketName', {
        value: assetBucket.bucketName,
        description: 'S3 Asset Bucket Name',
      });
    }
  }
  
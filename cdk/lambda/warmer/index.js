// cdk/lambda/warmer/index.js
const AWS = require('aws-sdk');
const lambdaClient = new AWS.Lambda();

/**
 * Lambda函数用于定期预热Next.js服务器函数
 * 每次执行都会保持多个函数实例处于活动状态
 */
exports.handler = async (event) => {
  console.log('Warming Lambda functions...');
  
  const paths = [
    '/',
    '/about',
    '/products',
    '/products/product-1',
    '/products/product-2'
  ];
  
  // 为每个路径创建一个预热请求
  const warmingPromises = paths.map(async (path) => {
    const params = {
      FunctionName: process.env.FUNCTION_ARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        path: path,
        httpMethod: 'GET',
        headers: {
          'x-warmer-request': 'true'
        }
      })
    };
    
    try {
      const response = await lambda.invoke(params).promise();
      console.log(`Warmed path: ${path}, Status: ${response.StatusCode}`);
      return { path, success: true };
    } catch (error) {
      console.error(`Error warming path: ${path}`, error);
      return { path, success: false, error: error.message };
    }
  });
  
  // 等待所有预热请求完成
  const results = await Promise.all(warmingPromises);
  
  // 返回结果摘要
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Warming complete',
      timestamp: new Date().toISOString(),
      results
    })
  };
};

// cdk/lambda/revalidation/index.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();
const cloudfront = new AWS.CloudFront();

/**
 * Lambda函数用于处理ISR重新验证请求
 * 从SQS队列接收消息，并触发Next.js页面重新生成
 */
exports.handler = async (event) => {
  console.log('Processing revalidation requests...');
  
  // 处理SQS消息
  const revalidationPromises = event.Records.map(async (record) => {
    try {
      const message = JSON.parse(record.body);
      const { path, tag } = message;
      
      // 如果有tag，则查询DynamoDB获取相关路径
      let pathsToRevalidate = [];
      
      if (tag) {
        console.log(`Looking up paths for tag: ${tag}`);
        const tagResult = await dynamodb.query({
          TableName: process.env.TAG_PATH_TABLE_NAME,
          KeyConditionExpression: 'tag = :tag',
          ExpressionAttributeValues: {
            ':tag': tag
          }
        }).promise();
        
        pathsToRevalidate = tagResult.Items.map(item => item.path);
        console.log(`Found ${pathsToRevalidate.length} paths for tag ${tag}`);
      } else if (path) {
        pathsToRevalidate = [path];
      }
      
      // 重新验证每个路径
      for (const pathToRevalidate of pathsToRevalidate) {
        // 调用Next.js的revalidate API
        const revalidateParams = {
          FunctionName: process.env.NEXT_SERVER_FUNCTION_ARN,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({
            path: '/api/revalidate',
            httpMethod: 'POST',
            body: JSON.stringify({
              path: pathToRevalidate,
              secret: process.env.REVALIDATION_SECRET
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          })
        };
        
        const response = await lambda.invoke(revalidateParams).promise();
        console.log(`Revalidated path: ${pathToRevalidate}, Status: ${response.StatusCode}`);
        
        // 清除CloudFront缓存
        await cloudfront.createInvalidation({
          DistributionId: process.env.DISTRIBUTION_ID,
          InvalidationBatch: {
            CallerReference: `revalidation-${Date.now()}`,
            Paths: {
              Quantity: 1,
              Items: [pathToRevalidate]
            }
          }
        }).promise();
        
        console.log(`Invalidated CloudFront cache for path: ${pathToRevalidate}`);
      }
      
      return { 
        success: true,
        message: `Revalidated ${pathsToRevalidate.length} paths`,
        paths: pathsToRevalidate
      };
    } catch (error) {
      console.error('Error processing revalidation request:', error);
      return { 
        success: false,
        error: error.message
      };
    }
  });
  
  // 等待所有重新验证请求完成
  const results = await Promise.all(revalidationPromises);
  
  // 返回结果摘要
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Revalidation processing complete',
      timestamp: new Date().toISOString(),
      results
    })
  };
};
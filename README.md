# aws-demo-next.js
next.js aws demo


# Next.js AWS CDK 部署说明

## 先决条件

1. 安装 AWS CLI 并配置
<!-- AWS CLI 是跟 AWS 云服务“对话”的工具。配置它（输入 Access Key、Secret Key、区域等），相当于给电脑一个“通行证”，让它能操作你的 AWS 账户。 -->
   ```bash
   aws configure
   ```

2. 安装 Node.js (推荐 v18.x 或更高版本)

3. 安装 AWS CDK
<!-- CDK 是 AWS 的“基础设施代码工具”，让你用代码（而不是手动点网页）建服务器、存储啥的。 -->
   ```bash
   npm install -g aws-cdk
   ```

## 部署步骤

### 1. 构建 Next.js 应用

```bash
# 安装项目依赖
cd nextjs-aws-demo
npm install

# 构建 Next.js 应用
npm run build
```

### 2. 准备 CDK 部署

```bash
# 进入 CDK 目录
cd cdk

# 安装 CDK 依赖
npm install

# 引导 CDK（如果是首次在此 AWS 账户和区域中使用 CDK）
# 在 AWS 上建个“工具箱”（S3 桶、IAM 角色等），CDK 以后用这个工具箱存临时文件、管理权限。
cdk bootstrap
```

### 3. 部署基础设施

```bash
# 查看 CDK 将要部署的更改
# 对比你本地的 CDK 代码和 AWS 上现在的状态，看看会改啥（比如加个服务器、删个存储）。
cdk diff

# 部署所有堆栈
# 把 CDK 代码“变成现实”，在 AWS 上建好所有东西（S3 桶、Lambda 函数、CloudFront 分发等）。
cdk deploy --all
```

### 4. 上传 Next.js 构建文件

执行部署后，CDK 将输出 S3 Asset Bucket 的名称。使用以下命令将 Next.js 静态文件上传到 S3：
<!-- 把 Next.js 打包好的静态文件（图片、CSS、JS）上传到 S3 桶，供 CloudFront 分发给用户。 -->
<!-- nextjsawsdemo-assets-dev-396913700129 -->
```bash
cd ..
aws s3 sync .next/static s3://YOUR-ASSET-BUCKET-NAME/_next/static/
```

静态文件上传后，还需要部署 Lambda 函数代码。Lambda 函数已经在 CDK 部署过程中创建，但您可能需要手动上传功能代码：
<!-- npm run build:lambda：把 Lambda 函数的代码打包成 zip 文件。 -->
<!-- aws lambda update-function-code：把打包好的代码上传到 AWS Lambda，更新服务器端逻辑（比如页面渲染、图片优化）。 -->
```bash
# 打包 Lambda 函数代码
cd cdk
npm run build:lambda

# 更新 Lambda 函数
# 给 Lambda 函数塞点“配置信息”（比如 S3 桶名、密钥），让它知道去哪儿拿静态文件、咋验证请求。
# NextJsAwsDemo-NextServer-dev
# NextJsAwsDemo-ImageOptimizer-dev
aws lambda update-function-code --function-name YOUR-NEXT-SERVER-FUNCTION-NAME --zip-file fileb://lambda-build/next-server.zip
aws lambda update-function-code --function-name YOUR-IMAGE-OPTIMIZER-FUNCTION-NAME --zip-file fileb://lambda-build/image-optimizer.zip
```

### 5. 配置环境变量

在 CloudFront 分发和 Lambda 函数部署后，更新 Lambda 函数的环境变量：
<!-- 给 Lambda 函数塞点“配置信息”（比如 S3 桶名、密钥），让它知道去哪儿拿静态文件、咋验证请求。 -->
<!-- YOUR-SECRET-KEY: 19c+XT87FclzV0IeKdR/30DYV2wOIbqI9mJ6YZ9FJV8= -->
```bash
aws lambda update-function-configuration \
  --function-name YOUR-NEXT-SERVER-FUNCTION-NAME \
  --environment "Variables={ASSET_BUCKET_NAME=YOUR-ASSET-BUCKET-NAME,REVALIDATION_SECRET=YOUR-SECRET-KEY}"

aws lambda update-function-configuration \
  --function-name NextJsAwsDemo-NextServer-dev \
  --environment "Variables={ASSET_BUCKET_NAME=nextjsawsdemo-assets-dev-396913700129,REVALIDATION_SECRET=19c+XT87FclzV0IeKdR/30DYV2wOIbqI9mJ6YZ9FJV8=}"
```

### 6. 验证部署

部署完成后，CDK 将输出 CloudFront 分发的域名。使用此域名访问您的 Next.js 应用：
<!-- CDK 部署完会给个 CloudFront 域名，打开看看网站能不能用。 -->
```
https://YOUR-DISTRIBUTION-DOMAIN-NAME
```

## 其他常用命令

### 列出所有堆栈
<!-- 列出 CDK 项目里有哪些“建筑”（堆栈），比如核心服务、数据库啥的。 -->
```bash
cdk list
```

### 单独部署某个堆栈
<!-- 只建某个部分（比如核心服务），不影响其他。 -->
```bash
cdk deploy NextJsAwsDemo-Core-dev
```

### 删除所有堆栈
```bash
cdk destroy --all
```

### 查看 CloudWatch 日志
```bash
aws logs get-log-events --log-group-name /aws/lambda/YOUR-FUNCTION-NAME --log-stream-name YOUR-LOG-STREAM
```

### 手动触发 Lambda 函数
<!-- 手动跑一下 Lambda（比如预热函数），测试它能不能正常干活。 -->
```bash
aws lambda invoke --function-name YOUR-WARMER-FUNCTION-NAME --payload '{}' response.json
```

### 更新 CloudFront 分发
```bash
aws cloudfront create-invalidation --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

<!-- 简单理解 -->
<!-- 
准备工具：装好 AWS CLI、Node.js、CDK，调好“遥控器”。
打包应用：把 Next.js 网站“炒好菜”。
搭框架：用 CDK 在 AWS 上建“厨房”（S3、Lambda、CloudFront）。
送货：把静态文件和代码送到“云端”。
调味：给 Lambda 加点“佐料”（环境变量）。
开张：访问域名，看看“餐厅”能不能营业。 -->
1. CDK 核心代码目录
lib/ (目录)
作用：包含 CDK 堆栈定义和构造，定义了 AWS 资源
状态：保留，这是 CDK 应用的核心代码
bin/ (目录)
作用：包含 CDK 应用入口点，定义堆栈和环境
状态：保留，这是 CDK 应用的启动点

2. Lambda 相关目录
lambda/ (目录)
作用：包含 Lambda 函数代码，如 ISR 重新验证、预热等
状态：保留，包含自定义 Lambda 函数


cdk/
├── bin/                   # CDK 应用入口点
│   └── cdk-app.ts         # 定义 CDK 应用和堆栈
├── lib/                   # CDK 构造和堆栈定义
│   ├── core-stack.ts      # 核心资源堆栈 (Lambda, S3, CloudFront)
│   ├── isr-stack.ts       # ISR (增量静态再生成) 堆栈
│   ├── warmer-stack.ts    # Lambda 预热器堆栈
│   └── cloudwatch-stack.ts # 监控和警报堆栈
└── lambda/                # Lambda 函数源代码
    ├── revalidation/      # ISR 重新验证 Lambda
    └── warmer/            # Lambda 预热器
const { join } = require('path');
const { readFileSync, existsSync } = require('fs');

// 获取服务器构建目录中的页面映射
const NEXT_DIR = '.next';
const PAGES_MANIFEST = join(process.cwd(), NEXT_DIR, 'server', 'pages-manifest.json');
const BUILD_MANIFEST = join(process.cwd(), NEXT_DIR, 'build-manifest.json');

// 尝试加载页面映射
let pagesManifest = {};
try {
  if (existsSync(PAGES_MANIFEST)) {
    pagesManifest = JSON.parse(readFileSync(PAGES_MANIFEST, 'utf8'));
  }
} catch (error) {
  console.warn('Unable to load pages manifest:', error);
}

// 创建响应的辅助函数
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
      ...headers
    },
    body,
    isBase64Encoded: false
  };
}

// 主处理函数
exports.handler = async (event, context) => {
  console.log('Event received:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    queryParams: event.queryStringParameters,
    headers: event.headers
  }, null, 2));

  try {
    const { path, httpMethod } = event;
    
    // 处理首页
    if (path === '/' || path === '/index.html') {
      return createResponse(200, renderHomePageHTML());
    }
    
    // 处理 API 路由
    if (path.startsWith('/api/')) {
      if (path === '/api/hello') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Hello from Next.js API on AWS!',
            timestamp: new Date().toISOString()
          })
        };
      }
    }
    
    // 处理静态资源 - 重定向到 S3
    if (path.startsWith('/_next/static/')) {
      const s3Url = `https://${process.env.ASSET_BUCKET_NAME}.s3.amazonaws.com${path}`;
      return {
        statusCode: 302,
        headers: {
          'Location': s3Url,
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };
    }
    
    // 处理 public 目录下的静态文件
    if (path.startsWith('/favicon.ico') || path.startsWith('/robots.txt')) {
      const s3Url = `https://${process.env.ASSET_BUCKET_NAME}.s3.amazonaws.com${path}`;
      return {
        statusCode: 302,
        headers: {
          'Location': s3Url,
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };
    }
    
    // 如果在页面映射中找到，渲染对应页面
    // 这里简化处理，实际情况中可能需要更复杂的路由匹配
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    
    if (normalizedPath === '/products') {
      return createResponse(200, renderProductsPageHTML());
    }
    
    // 处理动态路由，如 [slug]
    if (normalizedPath.startsWith('/products/')) {
      const slug = normalizedPath.replace('/products/', '');
      return createResponse(200, renderProductPageHTML(slug));
    }
    
    // 返回 404 页面
    return createResponse(404, render404PageHTML());
    
  } catch (error) {
    console.error('Error handling request:', error);
    return createResponse(500, render500PageHTML(error));
  }
};

// 页面渲染函数
function renderHomePageHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Next.js AWS CDK Demo</title>
  <meta name="description" content="Next.js with AWS CDK demo">
  <link rel="icon" href="/favicon.ico">
  <style>
    * {box-sizing: border-box;padding: 0;margin: 0;}
    html, body {max-width: 100vw;overflow-x: hidden;font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;}
    a {color: inherit;text-decoration: none;}
    .container {min-height: 100vh;padding: 0 0.5rem;display: flex;flex-direction: column;justify-content: center;align-items: center;}
    .main {padding: 5rem 0;flex: 1;display: flex;flex-direction: column;justify-content: center;align-items: center;}
    .title {margin: 0;line-height: 1.15;font-size: 4rem;text-align: center;}
    .description {text-align: center;line-height: 1.5;font-size: 1.5rem;}
    .grid {display: flex;align-items: center;justify-content: center;flex-wrap: wrap;max-width: 800px;margin-top: 3rem;}
    .card {margin: 1rem;padding: 1.5rem;text-align: left;color: inherit;text-decoration: none;border: 1px solid #eaeaea;border-radius: 10px;transition: color 0.15s ease, border-color 0.15s ease;width: 45%;}
    .card:hover, .card:focus, .card:active {color: #0070f3;border-color: #0070f3;}
    .card h2 {margin: 0 0 1rem 0;font-size: 1.5rem;}
    .card p {margin: 0;font-size: 1.25rem;line-height: 1.5;}
    .header {width: 100%;height: 80px;border-bottom: 1px solid #eaeaea;display: flex;justify-content: space-between;align-items: center;padding: 0 2rem;}
    .logo {font-size: 1.5rem;font-weight: bold;}
    .nav {display: flex;gap: 2rem;}
    .nav-link {color: #666;text-decoration: none;transition: color 0.15s ease;}
    .nav-link:hover {color: #0070f3;}
    .footer {width: 100%;height: 100px;border-top: 1px solid #eaeaea;display: flex;justify-content: center;align-items: center;}
    .timestamp {margin-top: 2rem;font-size: 0.8rem;color: #666;}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">
        <a href="/">Next.js AWS Demo</a>
      </div>
      <nav class="nav">
        <a href="/" class="nav-link">Home</a>
        <a href="/products" class="nav-link">Products</a>
      </nav>
    </header>
    
    <main class="main">
      <h1 class="title">
        Welcome to Next.js on AWS!
      </h1>

      <div class="grid">
        <a href="/products" class="card">
          <h2>Products &rarr;</h2>
          <p>Example of ISR (Incremental Static Regeneration) page</p>
        </a>
      </div>
      
      <p class="timestamp">Last updated: ${new Date().toISOString()}</p>
    </main>

    <footer class="footer">
      <div>
        <p>© ${new Date().getFullYear()} Next.js AWS CDK Demo</p>
      </div>
    </footer>
  </div>
</body>
</html>
  `;
}

function renderProductsPageHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Products | Next.js AWS CDK Demo</title>
  <meta name="description" content="Next.js with AWS CDK demo">
  <link rel="icon" href="/favicon.ico">
  <style>
    * {box-sizing: border-box;padding: 0;margin: 0;}
    html, body {max-width: 100vw;overflow-x: hidden;font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;}
    a {color: inherit;text-decoration: none;}
    .container {min-height: 100vh;padding: 0 0.5rem;display: flex;flex-direction: column;align-items: center;}
    .main {padding: 5rem 0;flex: 1;display: flex;flex-direction: column;align-items: center;max-width: 800px;}
    .title {margin: 0;line-height: 1.15;font-size: 3rem;}
    .description {text-align: center;line-height: 1.5;font-size: 1.25rem;margin: 2rem 0;}
    .grid {display: grid;grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));gap: 20px;width: 100%;margin-top: 3rem;}
    .card {margin: 1rem 0;padding: 1.5rem;text-align: left;color: inherit;text-decoration: none;border: 1px solid #eaeaea;border-radius: 10px;transition: color 0.15s ease, border-color 0.15s ease;}
    .card:hover, .card:focus, .card:active {color: #0070f3;border-color: #0070f3;}
    .card h2 {margin: 0 0 1rem 0;font-size: 1.5rem;}
    .card p {margin: 0 0 1rem 0;font-size: 1.25rem;line-height: 1.5;}
    .price {font-size: 2rem;font-weight: bold;color: #0070f3;margin-top: 1rem;}
    .header {width: 100%;height: 80px;border-bottom: 1px solid #eaeaea;display: flex;justify-content: space-between;align-items: center;padding: 0 2rem;}
    .logo {font-size: 1.5rem;font-weight: bold;}
    .nav {display: flex;gap: 2rem;}
    .nav-link {color: #666;text-decoration: none;transition: color 0.15s ease;}
    .nav-link:hover {color: #0070f3;}
    .footer {width: 100%;height: 100px;border-top: 1px solid #eaeaea;display: flex;justify-content: center;align-items: center;}
    .timestamp {margin-top: 2rem;font-size: 0.8rem;color: #666;}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">
        <a href="/">Next.js AWS Demo</a>
      </div>
      <nav class="nav">
        <a href="/" class="nav-link">Home</a>
        <a href="/products" class="nav-link">Products</a>
      </nav>
    </header>
    
    <main class="main">
      <h1 class="title">Products</h1>
      <p class="description">Browse our latest products</p>

      <div class="grid">
        <a href="/products/product-1" class="card">
          <h2>Product One</h2>
          <p>This is our first amazing product with many features.</p>
          <p class="price">$9.99</p>
        </a>
        
        <a href="/products/product-2" class="card">
          <h2>Product Two</h2>
          <p>Our second product with even more exciting capabilities.</p>
          <p class="price">$19.99</p>
        </a>
        
        <a href="/products/product-3" class="card">
          <h2>Product Three</h2>
          <p>Premium product with all the bells and whistles.</p>
          <p class="price">$29.99</p>
        </a>
      </div>
      
      <p class="timestamp">Last updated: ${new Date().toISOString()}</p>
    </main>

    <footer class="footer">
      <div>
        <p>© ${new Date().getFullYear()} Next.js AWS CDK Demo</p>
      </div>
    </footer>
  </div>
</body>
</html>
  `;
}

function renderProductPageHTML(slug) {
  // 定义产品数据
  const products = {
    'product-1': {
      name: 'Product One',
      description: 'This is our first amazing product with many features.',
      price: 9.99,
    },
    'product-2': {
      name: 'Product Two',
      description: 'Our second product with even more exciting capabilities.',
      price: 19.99,
    },
    'product-3': {
      name: 'Product Three',
      description: 'Premium product with all the bells and whistles.',
      price: 29.99,
    },
  };

  const product = products[slug] || {
    name: 'Unknown Product',
    description: 'This product does not exist.',
    price: 0,
  };

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${product.name} | Next.js AWS CDK Demo</title>
  <meta name="description" content="${product.description}">
  <link rel="icon" href="/favicon.ico">
  <style>
    * {box-sizing: border-box;padding: 0;margin: 0;}
    html, body {max-width: 100vw;overflow-x: hidden;font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;}
    a {color: inherit;text-decoration: none;}
    .container {min-height: 100vh;padding: 0 0.5rem;display: flex;flex-direction: column;align-items: center;}
    .main {padding: 5rem 0;flex: 1;display: flex;flex-direction: column;align-items: center;max-width: 800px;}
    .title {margin: 0;line-height: 1.15;font-size: 3rem;}
    .description {text-align: center;line-height: 1.5;font-size: 1.25rem;margin: 2rem 0;}
    .price {font-size: 2rem;font-weight: bold;color: #0070f3;}
    .back-link {margin-top: 2rem;}
    .back-link a {color: #0070f3;text-decoration: none;}
    .back-link a:hover {text-decoration: underline;}
    .timestamp {margin-top: 2rem;font-size: 0.8rem;color: #666;}
    .header {width: 100%;height: 80px;border-bottom: 1px solid #eaeaea;display: flex;justify-content: space-between;align-items: center;padding: 0 2rem;}
    .logo {font-size: 1.5rem;font-weight: bold;}
    .nav {display: flex;gap: 2rem;}
    .nav-link {color: #666;text-decoration: none;transition: color 0.15s ease;}
    .nav-link:hover {color: #0070f3;}
    .footer {width: 100%;height: 100px;border-top: 1px solid #eaeaea;display: flex;justify-content: center;align-items: center;}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">
        <a href="/">Next.js AWS Demo</a>
      </div>
      <nav class="nav">
        <a href="/" class="nav-link">Home</a>
        <a href="/products" class="nav-link">Products</a>
      </nav>
    </header>
    
    <main class="main">
      <h1 class="title">${product.name}</h1>
      <p class="description">${product.description}</p>
      <p class="price">$${product.price.toFixed(2)}</p>
      
      <div class="back-link">
        <a href="/products">&larr; Back to products</a>
      </div>
      
      <p class="timestamp">Last updated: ${new Date().toISOString()}</p>
    </main>

    <footer class="footer">
      <div>
        <p>© ${new Date().getFullYear()} Next.js AWS CDK Demo</p>
      </div>
    </footer>
  </div>
</body>
</html>
  `;
}

function render404PageHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>404 - Page Not Found | Next.js AWS CDK Demo</title>
  <meta name="description" content="Next.js with AWS CDK demo">
  <link rel="icon" href="/favicon.ico">
  <style>
    * {box-sizing: border-box;padding: 0;margin: 0;}
    html, body {max-width: 100vw;overflow-x: hidden;font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;}
    a {color: #0070f3;text-decoration: none;}
    .container {min-height: 100vh;display: flex;flex-direction: column;justify-content: center;align-items: center;text-align: center;padding: 0 20px;}
    .title {font-size: 4rem;margin-bottom: 20px;}
    .description {font-size: 1.5rem;margin-bottom: 30px;}
    .link {margin-top: 30px;}
    .link a:hover {text-decoration: underline;}
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">404</h1>
    <p class="description">This page could not be found.</p>
    <div class="link">
      <a href="/">Go back home</a>
    </div>
  </div>
</body>
</html>
  `;
}

function render500PageHTML(error) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>500 - Server Error | Next.js AWS CDK Demo</title>
  <meta name="description" content="Next.js with AWS CDK demo">
  <link rel="icon" href="/favicon.ico">
  <style>
    * {box-sizing: border-box;padding: 0;margin: 0;}
    html, body {max-width: 100vw;overflow-x: hidden;font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;}
    a {color: #0070f3;text-decoration: none;}
    .container {min-height: 100vh;display: flex;flex-direction: column;justify-content: center;align-items: center;text-align: center;padding: 0 20px;}
    .title {font-size: 4rem;margin-bottom: 20px;}
    .description {font-size: 1.5rem;margin-bottom: 30px;}
    .error {font-family: monospace;text-align: left;color: #ff0000;margin: 20px 0;padding: 10px;background: #fff5f5;border-radius: 5px;max-width: 800px;overflow: auto;}
    .link {margin-top: 30px;}
    .link a:hover {text-decoration: underline;}
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">500</h1>
    <p class="description">Internal Server Error</p>
    ${process.env.NODE_ENV === 'development' ? `<div class="error">${error.stack}</div>` : ''}
    <div class="link">
      <a href="/">Go back home</a>
    </div>
  </div>
</body>
</html>
  `;
}

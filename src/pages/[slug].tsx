import { GetStaticProps, GetStaticPaths } from 'next'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

interface ProductPageProps {
  slug: string;
  product: {
    name: string;
    description: string;
    price: number;
  };
  lastUpdated: string;
}

export default function ProductPage({ slug, product, lastUpdated }: ProductPageProps) {
    return (
      <div className="container">
        <Head>
          <title>{product.name} | Next.js AWS CDK Demo</title>
        </Head>
  
        <Header />
        
        <main className="main">
          <h1 className="title">{product.name}</h1>
          <p className="description">{product.description}</p>
          <p className="price">${product.price.toFixed(2)}</p>
          
          <div className="back-link">
            <a href="/">&larr; Back to home</a>
          </div>
          
          <p className="timestamp">Last updated: {lastUpdated}</p>
        </main>
  
        <Footer />
  
        <style jsx>{`
          .container {
            min-height: 100vh;
            padding: 0 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .main {
            padding: 5rem 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 800px;
          }
          .title {
            margin: 0;
            line-height: 1.15;
            font-size: 3rem;
          }
          .description {
            text-align: center;
            line-height: 1.5;
            font-size: 1.25rem;
            margin: 2rem 0;
          }
          .price {
            font-size: 2rem;
            font-weight: bold;
            color: #0070f3;
          }
          .back-link {
            margin-top: 2rem;
          }
          .back-link a {
            color: #0070f3;
            text-decoration: none;
          }
          .back-link a:hover {
            text-decoration: underline;
          }
          .timestamp {
            margin-top: 2rem;
            font-size: 0.8rem;
            color: #666;
          }
        `}</style>
      </div>
    )
};
  
export const getStaticPaths: GetStaticPaths = async () => {
    // 模拟从API获取产品数据
    const products = [
      { id: 'product-1' },
      { id: 'product-2' },
      { id: 'product-3' },
    ];
  
    return {
      paths: products.map(product => ({
        params: { slug: product.id },
      })),
      fallback: 'blocking', // 对于未生成的路径，将在请求时生成
    };
};
  
export const getStaticProps: GetStaticProps = async ({ params }) => {
    const slug = params?.slug as string;
    
    // 模拟从API获取产品数据
    // 在实际应用中，您可能会从数据库或外部API获取数据
    const productData = {
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
  
    const product = productData[slug as keyof typeof productData] || {
      name: 'Unknown Product',
      description: 'This product does not exist.',
      price: 0,
    };
  
    return {
      props: {
        slug,
        product,
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 60, // 每60秒重新验证
    };
};
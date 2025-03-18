import { GetStaticProps } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

interface HomeProps {
  lastUpdated: string;
}

export default function Home({ lastUpdated }: HomeProps) {
  return (
    <div className="container">
      <Head>
        <title>Next.js AWS CDK Demo</title>
        <meta name="description" content="Next.js with AWS CDK demo" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      
      <main className="main">


        <div className="grid">
          <Link href="/products" className="card">
            <h2>Products &rarr;</h2>
            <p>Example of ISR (Incremental Static Regeneration) page</p>
          </Link>

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
          justify-content: center;
          align-items: center;
        }
        .main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
          text-align: center;
        }
        .description {
          text-align: center;
          line-height: 1.5;
          font-size: 1.5rem;
        }
        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 800px;
          margin-top: 3rem;
        }
        .card {
          margin: 1rem;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
          width: 45%;
        }
        .card:hover,
        .card:focus,
        .card:active {
          color: #0070f3;
          border-color: #0070f3;
        }
        .card h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }
        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }
        .timestamp {
          margin-top: 2rem;
          font-size: 0.8rem;
          color: #666;
        }
      `}</style>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      lastUpdated: new Date().toISOString(),
    },
    revalidate: 60, // 重新生成页面的时间间隔（秒）
  }
}
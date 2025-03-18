import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        <Link href="/">
          Next.js AWS Demo
        </Link>
      </div>
      <nav className="nav">
        <Link href="/" className="nav-link">
          Home
        </Link>
        <Link href="/products" className="nav-link">
          Products
        </Link>
      </nav>
      
      <style jsx>{`
        .header {
          width: 100%;
          height: 80px;
          border-bottom: 1px solid #eaeaea;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .nav {
          display: flex;
          gap: 2rem;
        }
        .nav-link {
          color: #666;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .nav-link:hover {
          color: #0070f3;
        }
      `}</style>
    </header>
  );
}
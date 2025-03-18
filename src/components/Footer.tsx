export default function Footer() {
    return (
      <footer className="footer">
        <div>
          <p>© {new Date().getFullYear()} Next.js AWS CDK Demo</p>
        </div>
        
        <style jsx>{`
          .footer {
            width: 100%;
            height: 100px;
            border-top: 1px solid #eaeaea;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        `}</style>
      </footer>
    );
  }
  
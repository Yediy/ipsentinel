import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright Notice */}
          <div className="text-sm text-muted-foreground">
            © {currentYear} IP Sentinel. All rights reserved.
          </div>

          {/* Legal Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link 
              to="/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/refund-policy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Refund Policy
            </Link>
          </nav>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
            IP Sentinel provides tools to assist with intellectual property filings. 
            This service does not constitute legal advice. For legal matters, please consult 
            a qualified intellectual property attorney. Filing outcomes depend on various factors 
            and are not guaranteed.
          </p>
        </div>
      </div>
    </footer>
  );
}

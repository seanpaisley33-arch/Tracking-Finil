import type { Metadata } from 'next';
import './globals.css';
import { Package } from 'lucide-react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
export const metadata: Metadata = {
  title: 'GlobalTrack | Multi-Carrier Shipment Tracking',
  description: 'Real-time multi-carrier shipment tracking platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen flex flex-col bg-slate-50 text-slate-900`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  GlobalTrack
                </span>
              </Link>
              <nav className="flex items-center space-x-4">
                <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                  Admin Portal
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-grow">
          {children}
        </main>
        <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} GlobalTrack. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}

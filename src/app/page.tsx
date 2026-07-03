'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Package, Clock, ArrowRight, ShieldCheck, Zap, Globe, Star, CheckCircle } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import AnimatedText from '@/components/animations/AnimatedText';
import FadeIn from '@/components/animations/FadeIn';
import AnimatedCounter from '@/components/animations/AnimatedCounter';
import ScrollProgress from '@/components/animations/ScrollProgress';

export default function Home() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState<string | null>(null);
  const router = useRouter();

  const handleTrackingInput = (val: string) => {
    const upperVal = val.toUpperCase();
    setTrackingNumber(upperVal);
    
    // Regex based Carrier Auto-Detection
    if (/^1Z[A-Z0-9]{6}[0-9]{2}[0-9]{8}$/.test(upperVal)) {
      setCarrier('UPS');
    } else if (/^(\d{12}|\d{15})$/.test(upperVal)) {
      setCarrier('FedEx');
    } else if (/^(94|93|92|91)\d{20}$/.test(upperVal)) {
      setCarrier('USPS');
    } else {
      setCarrier(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      router.push(`/track/${trackingNumber.trim()}`);
    }
  };

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const shieldY = useTransform(scrollYProgress, [0, 1], ['0px', '-100px']);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <ScrollProgress />
      
      {/* Infinite Floating Background Orbs */}
      <motion.div 
        animate={{ y: [0, -50, 0], scale: [1, 1.1, 1] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300/20 rounded-full blur-[100px] pointer-events-none z-0"
      />
      <motion.div 
        animate={{ y: [0, 50, 0], scale: [1, 1.2, 1], x: [0, -30, 0] }} 
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] right-[-10%] w-[35rem] h-[35rem] bg-emerald-300/20 rounded-full blur-[120px] pointer-events-none z-0"
      />

      {/* Background Pattern with Parallax */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0 h-[150vh] w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></motion.div>

      {/* --- HERO SECTION --- */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 z-10 relative">
        
        {/* Trustpilot Badge */}
        <FadeIn delay={0.1} direction="up" className="mb-8">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <div className="flex space-x-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-emerald-500 text-emerald-500" />)}
            </div>
            <span className="text-sm font-semibold text-slate-700">Excellent 4.9/5</span>
            <span className="text-sm text-slate-400 border-l border-slate-300 pl-2 ml-2 flex items-center">
              <span className="font-bold text-emerald-500 mr-1">★</span> Trustpilot
            </span>
          </div>
        </FadeIn>

        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1]">
              <AnimatedText text="Track your package" type="words" />
              <AnimatedText text="with pinpoint accuracy." className="text-blue-600 block mt-2" delay={0.3} />
            </h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto font-medium"
            >
              Military-grade logistics tracking. Real-time GPS coordinates. Supported globally.
            </motion.p>
          </div>

          {/* Search Bar - Glassmorphism */}
          <FadeIn delay={0.8} direction="up" className="w-full mt-10">
            <div className="bg-white/70 backdrop-blur-2xl p-2 md:p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 max-w-2xl mx-auto relative group focus-within:ring-4 focus-within:ring-blue-100 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)]">
              <form onSubmit={handleSearch} className="flex items-center">
                <div className="pl-4 pr-3 text-slate-400">
                  <Search className="h-7 w-7" />
                </div>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => handleTrackingInput(e.target.value)}
                  placeholder="Enter your tracking number..."
                  className="flex-1 w-full bg-transparent text-xl md:text-2xl text-slate-900 outline-none py-4 font-semibold placeholder:font-normal placeholder:text-slate-400 uppercase"
                  required
                />
                {carrier && (
                  <div className="hidden sm:flex items-center space-x-1 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 mr-3 animate-fade-in">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-700">{carrier}</span>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 md:px-8 md:py-4 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg text-lg"
                >
                  <span className="hidden md:block mr-2">Track</span>
                  <ArrowRight className="h-6 w-6" />
                </motion.button>
              </form>
            </div>
          </FadeIn>
        </div>
        
        {/* Trusted Partners Banner */}
        <FadeIn delay={1.2} className="mt-20 text-center w-full max-w-4xl opacity-70">
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-6">Supported Carrier Networks</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* FedEx Logo */}
            <div className="flex font-black text-3xl tracking-tighter">
              <span className="text-[#4D148C]">Fed</span><span className="text-[#FF6600]">Ex</span>
            </div>
            {/* UPS Logo */}
            <div className="flex items-center text-[#351C15] font-black text-3xl tracking-tighter border-2 border-[#351C15] p-1 px-2 rounded-sm bg-[#FFB500]">
              UPS
            </div>
            {/* USPS Logo */}
            <div className="flex font-black text-3xl tracking-tighter text-[#004B87] italic">
              USPS
            </div>
            {/* DHL Logo */}
            <div className="flex font-black text-3xl tracking-tighter text-[#D40511] bg-[#FFCC00] px-2 pt-1 pb-0 rounded-sm">
              DHL
            </div>
          </div>
        </FadeIn>
      </main>

      {/* --- STATISTICS SECTION --- */}
      <section className="bg-blue-900 text-white py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <FadeIn direction="up">
              <div className="text-4xl md:text-5xl font-black mb-2 text-blue-300">
                <AnimatedCounter to={15} suffix="M+" />
              </div>
              <p className="text-blue-100 font-medium">Packages Tracked</p>
            </FadeIn>
            <FadeIn direction="up" delay={0.2}>
              <div className="text-4xl md:text-5xl font-black mb-2 text-blue-300">
                <AnimatedCounter to={99} suffix=".9%" />
              </div>
              <p className="text-blue-100 font-medium">API Uptime</p>
            </FadeIn>
            <FadeIn direction="up" delay={0.4}>
              <div className="text-4xl md:text-5xl font-black mb-2 text-blue-300">
                <AnimatedCounter to={150} suffix="+" />
              </div>
              <p className="text-blue-100 font-medium">Countries Supported</p>
            </FadeIn>
            <FadeIn direction="up" delay={0.6}>
              <div className="text-4xl md:text-5xl font-black mb-2 text-blue-300">
                <AnimatedCounter to={4} suffix="k+" />
              </div>
              <p className="text-blue-100 font-medium">Active Businesses</p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS / PARAGRAPHS --- */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-4 space-y-24">
          
          <div className="flex flex-col md:flex-row items-center gap-12">
            <FadeIn direction="right" className="flex-1 space-y-6">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Military-Grade Cryptography</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                We believe your logistics data should be yours alone. GlobalTrack employs AES-256 encryption for all tracking IDs and shipment metadata. When you generate a tracking number, it is cryptographically secured, ensuring that no third party can scrape or intercept your routing information.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-slate-700"><CheckCircle className="h-5 w-5 text-emerald-500 mr-3" /> Anonymous tracking links</li>
                <li className="flex items-center text-slate-700"><CheckCircle className="h-5 w-5 text-emerald-500 mr-3" /> End-to-end data encryption</li>
              </ul>
            </FadeIn>
            <FadeIn direction="left" className="flex-1 w-full relative">
              <div className="aspect-square md:aspect-[4/3] rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden relative group">
                 {/* HD Photo of secure logistics */}
                 <img src="https://images.unsplash.com/photo-1586528116311-ad8ed7c50a1e?q=80&w=2070&auto=format&fit=crop" alt="Secure Logistics Facility" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                 {/* Dark overlay for contrast */}
                 <div className="absolute inset-0 bg-blue-900/30 mix-blend-multiply"></div>
                 {/* Animated Icon Overlay */}
                 <motion.div style={{ y: shieldY }} className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-full border border-white/20 shadow-2xl">
                   <ShieldCheck className="h-20 w-20 text-white drop-shadow-lg" />
                 </motion.div>
              </div>
            </FadeIn>
          </div>

          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <FadeIn direction="left" className="flex-1 space-y-6">
              <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                <Globe className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Live GPS Telemetry</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Stop waiting for barcode scans. Our platform integrates directly with driver mobile applications and vehicle telematics to provide a live, vector-based map of your shipment. We utilize WebSockets to stream sub-second coordinate updates directly to your browser without refreshing.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-slate-700"><CheckCircle className="h-5 w-5 text-emerald-500 mr-3" /> Sub-second WebSocket streaming</li>
                <li className="flex items-center text-slate-700"><CheckCircle className="h-5 w-5 text-emerald-500 mr-3" /> High-fidelity vector maps</li>
              </ul>
            </FadeIn>
            <FadeIn direction="right" className="flex-1 w-full relative">
              <div className="aspect-square md:aspect-[4/3] rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden relative group">
                 {/* HD Photo of Global Telemetry/Map */}
                 <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" alt="Global Data Telemetry" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                 {/* Dark overlay for contrast */}
                 <div className="absolute inset-0 bg-emerald-900/40 mix-blend-multiply"></div>
                 
                 <div className="relative z-10 flex flex-col items-center">
                   <div className="relative">
                     <MapPin className="h-24 w-24 text-white drop-shadow-2xl relative z-10" />
                     <motion.div 
                        animate={{ scale: [1, 2, 2], opacity: [0.8, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-emerald-400 rounded-full z-0 blur-sm" 
                     />
                   </div>
                 </div>
              </div>
            </FadeIn>
          </div>

        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section className="py-24 bg-slate-50 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Trusted by thousands</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Don't just take our word for it. Here is what logistics professionals and everyday users have to say.</p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <FadeIn delay={0.2} direction="up" className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="flex text-emerald-500 mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}
              </div>
              <p className="text-slate-700 text-lg mb-6 leading-relaxed">"The live GPS telemetry completely changed how we manage our B2B shipments. We instantly lowered our customer support tickets by 40% because they can literally watch the truck."</p>
              <div className="flex items-center">
                <div className="h-12 w-12 bg-slate-200 rounded-full mr-4 flex items-center justify-center font-bold text-slate-500">MR</div>
                <div>
                  <h4 className="font-bold text-slate-900">Marcus Reynolds</h4>
                  <p className="text-sm text-slate-500">Logistics Director, TechCorp</p>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.4} direction="up" className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="flex text-emerald-500 mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}
              </div>
              <p className="text-slate-700 text-lg mb-6 leading-relaxed">"GlobalTrack's PDF invoice generation is a lifesaver. Being able to print commercial invoices and tracking receipts automatically with our customs stamps saves hours every day."</p>
              <div className="flex items-center">
                <div className="h-12 w-12 bg-blue-200 rounded-full mr-4 flex items-center justify-center font-bold text-blue-700">SJ</div>
                <div>
                  <h4 className="font-bold text-slate-900">Sarah Jenkins</h4>
                  <p className="text-sm text-slate-500">E-Commerce Manager</p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.6} direction="up" className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="flex text-emerald-500 mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}
              </div>
              <p className="text-slate-700 text-lg mb-6 leading-relaxed">"I just tracked a package coming from Europe. The interface is incredibly fast and knowing exactly what time the status updated down to the second gives huge peace of mind."</p>
              <div className="flex items-center">
                <div className="h-12 w-12 bg-indigo-200 rounded-full mr-4 flex items-center justify-center font-bold text-indigo-700">DT</div>
                <div>
                  <h4 className="font-bold text-slate-900">David Torres</h4>
                  <p className="text-sm text-slate-500">Consumer</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* --- BOTTOM CTA --- */}
      <section className="py-24 bg-blue-600 relative z-10 overflow-hidden text-center">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <FadeIn direction="up" className="max-w-3xl mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to see where it is?</h2>
          <p className="text-xl text-blue-100 mb-10">Stop guessing. Start tracking with military precision today.</p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Track a Package Now
          </button>
        </FadeIn>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black text-white tracking-tighter mb-4">GlobalTrack</h3>
            <p className="text-sm max-w-sm leading-relaxed">The world's most advanced logistics tracking and telemetry platform. Designed for modern e-commerce and enterprise supply chains.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Carrier Network</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Live Telemetry</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/admin/login" className="hover:text-white transition-colors">Admin Portal</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} GlobalTrack Logistics. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <span className="flex items-center"><Globe className="h-4 w-4 mr-1" /> English (US)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

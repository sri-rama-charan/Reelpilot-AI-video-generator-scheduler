"use client";

import Link from "next/link";
import {
  Play,
  Video,
  CalendarClock,
  Share2,
  Menu,
  X,
  ArrowRight,
  Zap,
  Sparkles,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-purple-500/30 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-pink-600/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
                ReelPilot
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                How it Works
              </Link>
              <Link
                href="#pricing"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Link href="/sign-up">
                  <Button className="rounded-full bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                    Start for Free
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Button>
                </Link>
                <UserButton />
              </SignedIn>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black/95 backdrop-blur-xl md:hidden flex flex-col items-center justify-center gap-8">
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-2xl font-medium text-slate-300 hover:text-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-2xl font-medium text-slate-300 hover:text-white transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-2xl font-medium text-slate-300 hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <div className="flex flex-col gap-4 mt-8 w-full max-w-xs px-4">
            <SignedOut>
              <Link
                href="/sign-in"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/10 bg-white/5 backdrop-blur-sm"
                >
                  Log in
                </Button>
              </Link>
              <Link
                href="/sign-up"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full rounded-full bg-white text-black">
                  Start for Free
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full rounded-full bg-white text-black">
                  Dashboard
                </Button>
              </Link>
              <div className="flex justify-center mt-2">
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 lg:pt-40 flex items-center justify-center min-h-[90vh]">
          <div className="container px-4 md:px-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300 mb-8 backdrop-blur-md"
            >
              <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
              <span className="font-medium">Introducing ReelPilot 1.0</span>
            </motion.div>

            <motion.h1
              className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="block text-white mb-2">Autoschedule Your</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 animate-gradient-x">
                AI Video Content
              </span>
            </motion.h1>

            <motion.p
              className="max-w-[42rem] leading-normal text-slate-300 sm:text-xl sm:leading-8 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              The ultimate AI video generator and scheduler for YouTube Shorts,
              Instagram Reels, and Email. Build your audience while you sleep.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Button
                size="lg"
                className="rounded-full h-14 px-8 bg-white text-black font-semibold text-lg hover:bg-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 group"
              >
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full h-14 px-8 border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white font-medium text-lg transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5" /> Watch Demo
              </Button>
            </motion.div>

            {/* App UI Mockup */}
            <motion.div
              className="mt-20 w-full max-w-5xl relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none"></div>
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl p-2 shadow-2xl relative overflow-hidden group">
                {/* Decorative window controls */}
                <div className="flex items-center gap-2 mb-4 px-4 pt-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4">
                  {/* Sidebar Scheduler Mockup */}
                  <div className="hidden md:flex flex-col gap-4 col-span-1 border-r border-white/5 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarClock className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium text-white">
                        Upcoming
                      </span>
                    </div>
                    <div className="h-16 rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-xs text-slate-300">
                          Today, 2:00 PM
                        </span>
                      </div>
                      <div className="h-2 w-3/4 bg-white/20 rounded-full"></div>
                    </div>
                    <div className="h-16 rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 flex flex-col justify-center gap-1 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                        <span className="text-xs text-white font-medium">
                          Tomorrow, 9:00 AM
                        </span>
                      </div>
                      <div className="h-2 w-1/2 bg-white/40 rounded-full mt-1"></div>
                    </div>
                    <div className="h-16 rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col justify-center gap-1 opacity-50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-xs text-slate-300">
                          Friday, 5:00 PM
                        </span>
                      </div>
                      <div className="h-2 w-2/3 bg-white/20 rounded-full"></div>
                    </div>
                  </div>

                  {/* Main content - Video Generation Mockup */}
                  <div className="col-span-1 md:col-span-3 flex flex-col gap-6">
                    {/* Prompt input fake */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-slate-400 font-mono whitespace-nowrap overflow-hidden text-ellipsis border-r-2 border-purple-500 animate-[typing_3s_steps(40,end)_infinite,blink_1s_step-end_infinite]">
                          Create a trending short about AI tools for 2026...
                        </span>
                      </div>
                      <div className="hidden sm:flex bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg items-center gap-2 font-medium">
                        <Zap className="w-3 h-3" /> Generate
                      </div>
                    </div>

                    {/* Previews */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          platform: "Instagram",
                          color: "text-pink-500",
                          active: false,
                        },
                        {
                          platform: "YouTube",
                          color: "text-red-500",
                          active: true,
                        },
                        {
                          platform: "TikTok",
                          color: "text-cyan-400",
                          active: false,
                        },
                        {
                          platform: "Preview",
                          color: "text-slate-400",
                          active: false,
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className={`aspect-[9/16] rounded-xl border relative overflow-hidden flex flex-col ${item.active ? "bg-gradient-to-br from-purple-900/40 to-black border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "bg-white/5 border-white/10"}`}
                        >
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded backdrop-blur-md z-20">
                            <div
                              className={`w-2 h-2 rounded-full ${item.active ? "bg-red-500 animate-pulse" : "bg-slate-500"}`}
                            ></div>
                            <span className="text-[10px] uppercase font-bold text-slate-300">
                              {item.platform}
                            </span>
                          </div>

                          {/* Fake video timeline inside abstract shape */}
                          <div className="mt-auto p-3 w-full bg-gradient-to-t from-black to-transparent z-20">
                            {item.active && (
                              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-2">
                                <motion.div
                                  className="h-full bg-purple-500"
                                  initial={{ width: "0%" }}
                                  animate={{ width: "100%" }}
                                  transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                />
                              </div>
                            )}
                            <div className="h-2 w-3/4 bg-white/40 rounded mt-1"></div>
                            <div className="h-2 w-1/2 bg-white/20 rounded mt-1"></div>
                          </div>

                          {item.active && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 backdrop-blur-md z-20 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                              <Play className="w-5 h-5 text-white ml-1" />
                            </div>
                          )}

                          {/* Background image placeholder */}
                          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Elements (Representing Status/Platforms) */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                  className="absolute -right-4 md:-right-8 top-1/3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl p-3 flex items-center gap-3 z-30"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-white font-medium">
                      Reel Scheduled
                    </p>
                    <p className="text-[10px] text-green-400 mt-0.5 font-medium">
                      Success
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 15, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 5,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute -left-4 md:-left-8 bottom-1/3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl p-3 flex items-center gap-3 z-30"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-white font-medium">
                      Short Published
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      2 mins ago
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
                Everything you need to go viral.
              </h2>
              <p className="text-lg text-slate-400">
                ReelPilot combines state-of-the-art AI video generation with
                powerful scheduling tools to put your content creation on
                autopilot.
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Feature 1 */}
              <motion.div
                variants={itemVariants}
                className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="h-14 w-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-300">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  AI Short Generator
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Turn text prompts, articles, or long-form videos into highly
                  engaging, viral-ready shorts in seconds using our advanced AI.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                variants={itemVariants}
                className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-300">
                  <Share2 className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Multi-Platform
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Publish directly to YouTube Shorts, Instagram Reels, and even
                  compile summaries for your Email newsletters with one click.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                variants={itemVariants}
                className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="h-14 w-14 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mb-6 text-pink-400 group-hover:scale-110 group-hover:bg-pink-500/30 transition-all duration-300">
                  <CalendarClock className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Set-and-Forget
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Our smart autoscheduler determines the perfect time to post
                  based on audience engagement data. Just fill your queue and
                  relax.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/20 -z-10"></div>
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 rounded-[3rem] p-10 md:p-16 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl rounded-full"></div>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white relative z-10">
                Ready to dominate short-form video?
              </h2>
              <p className="text-lg md:text-xl text-purple-200 mb-10 max-w-2xl mx-auto relative z-10 font-light">
                Join thousands of creators who are scaling their audience on
                autopilot with ReelPilot.
              </p>
              <Button
                size="lg"
                className="rounded-full h-14 px-10 bg-white text-black font-semibold text-lg hover:bg-slate-200 shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300 relative z-10"
              >
                Start Your Free Trial
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black pt-16 pb-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-1.5 rounded-lg">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  ReelPilot
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
                The AI-powered platform designed to generate, schedule, and
                scale your short-form video strategy across all networks.
              </p>
              <div className="flex items-center gap-4 text-slate-400">
                <a href="#" className="hover:text-white transition-colors">
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Product</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Video Guides
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Legal
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>
              © {new Date().getFullYear()} ReelPilot Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

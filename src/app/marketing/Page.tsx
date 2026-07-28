import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Resolve AI | AI Complaint Intelligence Platform",
  description:
    "Transform customer complaints into actionable insights with AI-powered analysis, root cause detection, and automated response recommendations.",
};

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

          <Link href="/" className="flex items-center">
            <Image
              src="/icons/logo.svg"
              alt="Resolve AI"
              width={150}
              height={40}
              priority
            />
          </Link>


          <nav className="hidden md:flex gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>

            <a href="#workflow" className="hover:text-white transition">
              How It Works
            </a>

            <a href="#demo" className="hover:text-white transition">
              Demo
            </a>
          </nav>


          <div className="flex items-center gap-3">

            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                Sign In
              </Button>
            </Link>


            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
                Try Resolve AI
              </Button>
            </Link>

          </div>

        </div>
      </header>



      <main>

        {/* Hero */}

        <section className="relative overflow-hidden px-6 pt-28 pb-24">

          <div className="absolute left-1/2 top-40 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-blue-600/20 blur-[140px]" />


          <div className="relative mx-auto max-w-5xl text-center">


            <div className="mb-8 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
              AI-powered Customer Complaint Intelligence
            </div>


            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">

              Turn customer complaints into

              <span className="block text-blue-500">
                business intelligence
              </span>

            </h1>


            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-400">

              Resolve AI automatically analyzes complaints from every channel,
              detects customer sentiment, identifies root causes, and helps
              teams take faster action.

            </p>


            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">

              <Link href="/login">

                <Button
                  size="lg"
                  className="bg-blue-600 px-8 hover:bg-blue-500"
                >
                  Analyze Your First Complaint
                </Button>

              </Link>


              <a href="#features">

                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-transparent px-8 text-slate-200 hover:bg-slate-900"
                >
                  Explore Features
                </Button>

              </a>


            </div>


          </div>

        </section>




        {/* Features */}

        <section
          id="features"
          className="mx-auto max-w-7xl px-6 py-24"
        >

          <div className="grid gap-6 md:grid-cols-3">


            {[
              {
                title: "AI Complaint Analysis",
                description:
                  "Automatically classify complaints, detect sentiment, urgency, and customer intent.",
              },

              {
                title: "Root Cause Detection",
                description:
                  "Discover recurring issues and identify what is causing customer frustration.",
              },

              {
                title: "Action Recommendations",
                description:
                  "Generate responses, corrective actions, and executive summaries instantly.",
              },

            ].map((feature) => (

              <div
                key={feature.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8"
              >

                <h3 className="text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-slate-400">
                  {feature.description}
                </p>

              </div>

            ))}


          </div>

        </section>





        {/* Workflow */}

        <section
          id="workflow"
          className="border-y border-slate-800 bg-slate-900/30 px-6 py-24"
        >

          <div className="mx-auto max-w-5xl text-center">

            <h2 className="text-3xl font-bold md:text-5xl">
              From complaint to insight in seconds
            </h2>


            <div className="mt-12 grid gap-6 md:grid-cols-4">


              {[
                "Collect complaints",
                "Analyze with AI",
                "Find root causes",
                "Take action",
              ].map((step, index) => (

                <div
                  key={step}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-6"
                >

                  <div className="text-blue-500 text-2xl font-bold">
                    0{index + 1}
                  </div>

                  <p className="mt-3 text-slate-300">
                    {step}
                  </p>

                </div>

              ))}


            </div>

          </div>

        </section>





        {/* CTA */}

        <section
          id="demo"
          className="px-6 py-24"
        >

          <div className="mx-auto max-w-4xl rounded-3xl border border-blue-500/20 bg-blue-500/10 p-12 text-center">

            <h2 className="text-4xl font-bold">
              Start understanding your customers today
            </h2>


            <p className="mt-4 text-slate-300">
              Upload complaints and see AI-powered insights instantly.
            </p>


            <Link href="/login">

              <Button
                size="lg"
                className="mt-8 bg-blue-600 hover:bg-blue-500"
              >
                Try Resolve AI
              </Button>

            </Link>


          </div>

        </section>


      </main>



      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">

        © {new Date().getFullYear()} Resolve AI. All rights reserved.

      </footer>


    </div>
  );
              }

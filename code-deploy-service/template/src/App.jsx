import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <header className="border-b border-white/10 backdrop-blur sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={viteLogo} alt="Vite" className="h-8 w-8" />
            <img src={reactLogo} alt="React" className="h-8 w-8" />
            <span className="font-semibold tracking-tight">Vite + React + Tailwind</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white transition-colors" href="#features">Features</a>
            <a className="hover:text-white transition-colors" href="#cta">Get Started</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -top-24 -left-24 h-72 w-72 bg-fuchsia-500 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 bg-sky-500 rounded-full blur-3xl" />
          </div>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Build modern UIs fast with Tailwind
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-2xl">
              A minimal starter wired for productivity. Customize this hero, add sections, and ship.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <a href="#cta" className="inline-flex items-center rounded-md bg-white px-4 py-2 text-slate-900 font-medium shadow hover:shadow-lg transition">
                Get Started
              </a>
              <button onClick={() => setCount((c) => c + 1)} className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 hover:bg-white/10 transition">
                Count is {count}
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Utility-first',
              desc: 'Use Tailwind classes to compose designs directly in your markup.'
            },
            {
              title: 'Accessible',
              desc: 'Semantic HTML, readable contrast, and focus states by default.'
            },
            {
              title: 'Responsive',
              desc: 'Mobile-first defaults with simple, predictable breakpoints.'
            },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{f.desc}</p>
            </div>
          ))}
        </section>

        <section id="cta" className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-fuchsia-600 p-1">
            <div className="rounded-2xl bg-slate-900 p-8">
              <h2 className="text-2xl md:text-3xl font-bold">Ready to customize?</h2>
              <p className="mt-2 text-slate-300">Start editing <code className="text-white">src/App.jsx</code> to make it yours.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-slate-400">
          Built with Vite, React, and Tailwind.
        </div>
      </footer>
    </div>
  )
}

export default App

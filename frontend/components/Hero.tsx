"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ThreeAmbient from "./ThreeAmbient";
import MagneticButton from "./MagneticButton";
import SpectrumCanvas from "./SpectrumCanvas";

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } },
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-24 px-6 overflow-hidden grain">
      {/* 3D Background */}
      <ThreeAmbient />

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center w-full relative z-10">
        <motion.div variants={containerVars} initial="hidden" animate="show">
          <motion.p variants={itemVars} className="eyebrow mb-5 text-signal/80">
            Grayscale-Native · Edge-Ready · Reproducible
          </motion.p>

          <motion.h1 variants={itemVars} className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-paper drop-shadow-lg relative">
            Solving the deployment<br />
            <span className="relative inline-block mt-3 mb-1">
              <span className="absolute inset-0 bg-gradient-to-r from-signal to-blue-500 blur-2xl opacity-60 animate-pulse mix-blend-screen" />
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-signal to-white drop-shadow-md">
                bottleneck.
              </span>
            </span>
          </motion.h1>

          <motion.p variants={itemVars} className="mt-8 text-dim text-lg max-w-xl leading-relaxed font-body">
            Benchmark performance is essential, but it is only one requirement for real-world medical AI. Practical deployment also demands efficiency, reproducible evaluation, and computational feasibility. GrayNet was engineered to balance diagnostic accuracy with extreme parameter efficiency—delivering competitive performance on constrained hardware.
          </motion.p>

          <motion.div variants={itemVars} className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="/lab" passHref>
              <MagneticButton className="group relative overflow-hidden inline-flex items-center gap-3 bg-signal border border-signal text-ink font-mono text-sm uppercase tracking-widest px-8 py-4 rounded-full transition-all shadow-[0_0_30px_-5px_rgba(62,217,196,0.4)] hover:shadow-[0_0_40px_-5px_rgba(62,217,196,0.7)] hover:scale-105 active:scale-95 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent z-10">
                Launch the Interactive Lab
              </MagneticButton>
            </Link>
            <a
              href="#motivation"
              className="font-mono text-sm uppercase tracking-widest text-dim hover:text-signal transition-colors px-2 py-3.5 group flex items-center gap-2"
            >
              Examine the Philosophy
              <motion.span
                initial={{ y: 0 }}
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                ↓
              </motion.span>
            </a>
          </motion.div>

          <motion.div variants={itemVars} className="mt-12 hairline opacity-50" />

          <motion.dl variants={itemVars} className="mt-12 grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md hover:bg-white/10 hover:border-signal/50 transition-all group">
              <dt className="eyebrow opacity-70 group-hover:text-signal transition-colors">Master Model</dt>
              <dd className="data text-2xl text-paper mt-2 font-light tracking-wide">813.1K</dd>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md hover:bg-white/10 hover:border-signal/50 transition-all group">
              <dt className="eyebrow opacity-70 group-hover:text-signal transition-colors">Femto Model</dt>
              <dd className="data text-2xl text-signal mt-2 font-light tracking-wide drop-shadow-[0_0_15px_rgba(62,217,196,0.5)]">24.7K</dd>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md hover:bg-white/10 hover:border-signal/50 transition-all group">
              <dt className="eyebrow opacity-70 group-hover:text-signal transition-colors">Combined Acc</dt>
              <dd className="data text-2xl text-paper mt-2 font-light tracking-wide">98.10%</dd>
            </div>
          </motion.dl>
        </motion.div>

        {/* Replace standard canvas with something highly polished */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.3 }}
          className="relative"
        >
          {/* A glowing backdrop for the canvas */}
          <div className="absolute inset-0 bg-signal/20 blur-[100px] rounded-full -z-10 translate-y-10" />
          <SpectrumCanvas />
        </motion.div>
      </div>
    </section>
  );
}

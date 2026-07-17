"use client";

import { motion } from "framer-motion";

export default function MotivationSection() {
    return (
        <section id="motivation" className="px-6 py-24 border-t border-line bg-ink/50 relative overflow-hidden">
            {/* Subtle ambient glow in the background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-signal/5 blur-[120px] rounded-[100%] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-20 relative z-10">

                {/* Core Thesis */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="eyebrow mb-6 text-signal">The Motivation</p>
                    <h2 className="font-display text-4xl sm:text-5xl text-paper leading-[1.15] mb-8">
                        The world doesn&apos;t need another isolated 99% benchmark. It needs AI that actually deploys.
                    </h2>
                    <div className="space-y-6 text-dim text-lg leading-relaxed font-body">
                        <p>
                            Today, numerous deep learning models report exceptionally high classification performance on brain tumor isolates. Yet, many of these architectures remain entirely impractical for real-world clinical use.
                        </p>
                        <p>
                            Models demanding tens of millions of parameters require substantial compute, memory, and power. They cannot run on edge devices, portable diagnostic systems, or within resource-constrained healthcare environments. GrayNet was engineered to address this exact gap between mathematical supremacy and practical reality.
                        </p>
                    </div>
                </motion.div>

                {/* The Central Question */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="pl-8 border-l-2 border-signal/40 relative"
                >
                    <div className="absolute -left-[18px] top-6 w-8 h-px bg-signal/40" />
                    <p className="font-display italic text-2xl md:text-3xl text-paper leading-snug">
                        "The central research question is not &apos;Can we reach another 99% accuracy?&apos; but rather, &apos;Can we deliver clinically competitive performance in a model compact enough to be deployed almost anywhere?&apos;"
                    </p>
                </motion.div>

                {/* The Two Pillars */}
                <div className="grid sm:grid-cols-2 gap-12 pt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <h3 className="font-mono uppercase tracking-widest text-xs mb-4 text-signal">01 · Extreme Parameter Efficiency</h3>
                        <p className="text-dim leading-relaxed">
                            Rather than pursuing marginal accuracy gains at enormous computational cost, the GrayNet family ranges from a fraction of a megabyte to just a few megabytes. Dramatically smaller than conventional CNN and Vision Transformer architectures, it acts as a lightweight spearhead bringing robust diagnosis directly to low-power edge accelerators and embedded platforms.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <h3 className="font-mono uppercase tracking-widest text-xs mb-4 text-warn">02 · Uncompromising Integrity</h3>
                        <p className="text-dim leading-relaxed">
                            Medical AI directly impacts patient care, demanding rigorous experimental methodology. In a landscape where numerous published studies unknowingly report results influenced by data leakage, GrayNet establishes strict patient-independent partitioning and transparent preprocessing. Trustworthy evaluation is equally as critical as architectural innovation.
                        </p>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}

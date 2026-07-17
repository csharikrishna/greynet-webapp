"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScatterSelector({ models, selected, onToggle }: any) {
    const [hovered, setHovered] = useState<any | null>(null);

    // Sort models by parameters, then accuracy to spread them out evenly on X
    const parsedModels = useMemo(() => {
        const mapped = models.map((m: any) => ({
            ...m,
            p: Number(m.params),
            a: Number(m.stdAcc),
        }));
        return mapped.sort((i: any, j: any) => (i.p === j.p ? i.a - j.a : i.p - j.p));
    }, [models]);

    const minAcc = Math.min(...parsedModels.map((m: any) => m.a));
    const maxAcc = Math.max(...parsedModels.map((m: any) => m.a));
    const aRange = maxAcc - minAcc || 1;

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="relative w-full h-[310px] rounded-xl border border-white/5 bg-[#0A0C0E]/90 overflow-hidden group shadow-inner">
                {/* Sleek Subdued Grid */}
                <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:35px_35px]" />

                {/* Clean Axis Labels */}
                <div className="absolute bottom-4 right-6 font-mono text-[10px] text-white/30 uppercase tracking-widest pointer-events-none">
                    Larger Scale →
                </div>
                <div className="absolute top-4 left-4 font-mono text-[10px] text-white/30 uppercase tracking-widest pointer-events-none flex items-center gap-2">
                    <span className="text-signal rotate-[-90deg] block">↑</span> Validation Accuracy
                </div>

                {/* Rendering Model Nodes */}
                <div className="absolute inset-0 pointer-events-none">
                    {parsedModels.map((m: any, index: number) => {
                        const isSelected = selected.includes(m.id);
                        const isHovered = hovered?.id === m.id;

                        // Spread models evenly across horizontal space (avoids left-side clumping entirely)
                        const x = 12 + (index / (parsedModels.length - 1)) * 76;
                        // Keep authentic vertical map, scaled to fit in the box nicely (15% to 85% height)
                        const y = 15 + ((m.a - minAcc) / aRange) * 70;

                        return (
                            <div
                                key={m.id}
                                className="absolute pointer-events-none"
                                style={{ left: `${x}%`, bottom: `${y}%` }}
                            >
                                <motion.button
                                    onClick={() => onToggle(m.id)}
                                    onMouseEnter={() => setHovered(m)}
                                    onMouseLeave={() => setHovered(null)}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: 1,
                                        scale: isSelected ? 1.1 : isHovered ? 1.2 : 1,
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={`relative flex items-center justify-center w-6 h-6 -ml-3 -mb-3 rounded-full pointer-events-auto z-10 transition-all duration-300 ${isSelected
                                        ? 'bg-signal/20 border border-signal shadow-[0_0_30px_rgba(62,217,196,0.8)] scale-110'
                                        : 'bg-black/80 border border-white/20 hover:border-signal hover:bg-signal/30'
                                        }`}
                                >
                                    {/* Node Core */}
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${isSelected ? 'bg-signal' : isHovered ? 'bg-signal/50' : 'bg-white/30'
                                            }`}
                                    />
                                </motion.button>

                                {/* Optional: Render small label under selected nodes so you don't forget which is which */}
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 font-mono text-[9px] text-signal whitespace-nowrap drop-shadow-md z-0"
                                        >
                                            {m.name.split(' ')[0]}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dedicated Telemetry HUD Toolbar (Moved BELOW the graph to guarantee no overlap) */}
            <div className="w-full h-14 rounded-xl border border-white/5 bg-[#0A0C0E]/50 backdrop-blur-md px-6 flex items-center justify-center overflow-hidden">
                {hovered ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full items-center justify-between">
                        <p className="font-display text-sm text-signal truncate">{hovered.name}</p>
                        <div className="flex gap-6 font-mono text-[11px] text-dim">
                            <span>Acc: <span className="text-paper">{hovered.a.toFixed(2)}%</span></span>
                            <span>Size: <span className="text-paper">{hovered.p}K Params</span></span>
                        </div>
                    </motion.div>
                ) : (
                    <p className="font-mono text-[10px] text-dim/40 text-center uppercase tracking-widest">
                        Hover over nodes to load telemetry
                    </p>
                )}
            </div>
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { MODELS } from "@/lib/models-data";

export default function CompressionLadder() {
  const [activeId, setActiveId] = useState(MODELS[0].id);
  const active = useMemo(
    () => MODELS.find((m) => m.id === activeId)!,
    [activeId]
  );

  const data = MODELS.map((m) => ({
    ...m,
    x: m.params,
    xLog: Math.log10(m.params),
    y: m.stdAcc,
  }));

  const idx = MODELS.findIndex((m) => m.id === activeId);

  return (
    <section className="px-6 py-24 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow mb-4">Edge-Ready Scalability</p>
        <h2 className="font-display text-3xl sm:text-4xl text-paper max-w-2xl leading-tight">
          Scaling symmetrically for edge deployment.
        </h2>
        <p className="mt-5 text-dim max-w-2xl leading-relaxed">
          By adjusting a single scaling parameter (
          <code className="data text-signal text-sm">width_mult</code>
          ), the entire multi-stage architecture shrinks symmetrically. This eliminates the need to redesign custom networks per hardware tier, allowing GrayNet to scale from an 813K-parameter cloud model down to a 24K-parameter embedded micro-model while maintaining solid diagnostic performance.
        </p>

        <div className="mt-14 grid lg:grid-cols-[1fr_320px] gap-10 items-start">
          <div className="h-[340px] border border-line rounded-sm bg-panel/40 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#232A30" strokeDasharray="2 4" />
                <XAxis
                  type="number"
                  dataKey="xLog"
                  domain={[Math.log10(20), Math.log10(900)]}
                  ticks={[20, 50, 100, 200, 500, 900].map(v => Math.log10(v))}
                  tickFormatter={(val) => Math.pow(10, val).toFixed(0)}
                  tick={{ fill: "#8B979C", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  stroke="#232A30"
                  label={{
                    value: "Parameters (K, log scale)",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#8B979C",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[96.5, 98.5]}
                  ticks={[96.5, 97.0, 97.5, 98.0, 98.5]}
                  tickFormatter={(val) => val.toFixed(1)}
                  tick={{ fill: "#8B979C", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  stroke="#232A30"
                  width={44}
                />
                <Scatter data={data} shape="circle">
                  {data.map((d, i) => (
                    <Cell
                      key={d.id}
                      r={i === idx ? 8 : 5}
                      fill={i === idx ? "#3ED9C4" : "#8B979C"}
                      cursor="pointer"
                      onClick={() => setActiveId(d.id)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div>
            <input
              type="range"
              min={0}
              max={MODELS.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setActiveId(MODELS[Number(e.target.value)].id)}
              className="w-full accent-signal mb-8"
              aria-label="Select GrayNet model checkpoint"
            />
            <div className="border border-line rounded-sm p-5 bg-panel/60 space-y-4">
              <div>
                <p className="eyebrow">Checkpoint</p>
                <p className="font-display text-xl text-paper">{active.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="width_mult" value={active.widthMult.toFixed(2)} />
                <Stat label="Params" value={`${active.params}K`} />
                <Stat label="Size" value={`${(active.sizeKB / 1024).toFixed(2)} MB`} />
                <Stat label="Std. accuracy" value={`${active.stdAcc}%`} highlight />
                <Stat label="CPU (1 thread)" value={`${active.cpu1t} ms`} />
                <Stat label="GPU" value={`${active.gpu} ms`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-dim">
        {label}
      </p>
      <p className={`data text-lg ${highlight ? "text-signal" : "text-paper"}`}>
        {value}
      </p>
    </div>
  );
}

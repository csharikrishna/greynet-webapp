import { MODELS } from "@/lib/models-data";

export default function BenchmarkTable() {
  return (
    <section className="px-6 py-24 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow mb-4">Real-World Deployment</p>
        <h2 className="font-display text-3xl sm:text-4xl text-paper max-w-2xl leading-tight">
          Performance metrics on constrained hardware.
        </h2>
        <p className="mt-5 text-dim max-w-2xl leading-relaxed mb-10">
          Inference latency and accuracy were measured using a single CPU thread and an isolated GPU to simulate constrained edge environments. Notably, Test-Time Augmentation (TTA) provides robust stability for the smallest network variants, improving accuracy without requiring permanent parameter growth.
        </p>
        <div className="overflow-x-auto border border-line rounded-sm">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-line bg-panel/60 text-left">
                {["Model", "Params", "Size", "CPU 1T", "CPU 4T", "GPU", "Std. Acc", "TTA Acc", "Δ"].map(
                  (h) => (
                    <th
                      key={h}
                      className="font-mono text-[11px] uppercase tracking-widest text-dim px-4 py-3 font-normal"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-line/60 ${i % 2 === 0 ? "" : "bg-panel/30"}`}
                >
                  <td className="px-4 py-3 text-paper">{m.name}</td>
                  <td className="px-4 py-3 data text-dim">{m.params}K</td>
                  <td className="px-4 py-3 data text-dim">
                    {(m.sizeKB / 1024).toFixed(2)} MB
                  </td>
                  <td className="px-4 py-3 data text-dim">{m.cpu1t} ms</td>
                  <td className="px-4 py-3 data text-dim">{m.cpu4t} ms</td>
                  <td className="px-4 py-3 data text-dim">{m.gpu} ms</td>
                  <td className="px-4 py-3 data text-paper">{m.stdAcc}%</td>
                  <td className="px-4 py-3 data text-paper">{m.ttaAcc}%</td>
                  <td
                    className={`px-4 py-3 data ${m.delta >= 0 ? "text-signal" : "text-alert"
                      }`}
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-xs text-dim">
          TTA = test-time augmentation (classical). CPU timings measured
          single-image, batch size 1.
        </p>
      </div>
    </section>
  );
}

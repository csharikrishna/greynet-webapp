import { STAGES } from "@/lib/models-data";

export default function ArchitectureWalkthrough() {
  return (
    <section id="architecture" className="px-6 py-24 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow mb-4">The GrayNet Pipeline</p>
        <h2 className="font-display text-3xl sm:text-4xl text-paper max-w-2xl leading-tight">
          Architectural formulation and forward pass.
        </h2>
        <p className="mt-5 text-dim max-w-2xl leading-relaxed">
          This visualization traces the exact inference pathway of a single 128×128 MRI slice. The architecture leverages early frequency-domain filtering, local statistical pooling, and dynamic channel modulation to isolate diagnostically relevant spatial textures.
        </p>

        <div className="mt-16 relative">
          <div
            className="absolute left-[27px] top-2 bottom-2 w-px bg-line hidden sm:block"
            aria-hidden
          />
          <ol className="space-y-10">
            {STAGES.map((s) => (
              <li key={s.id} className="sm:pl-20 relative">
                <div className="hidden sm:flex absolute left-0 top-0 w-14 h-14 rounded-full border border-line bg-panel items-center justify-center">
                  <span className="data text-sm text-signal">
                    {String(s.index).padStart(2, "0")}
                  </span>
                </div>
                <div className="border border-line rounded-sm bg-panel/60 p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                    <h3 className="font-display text-xl text-paper">
                      {s.name}
                    </h3>
                    <span className="eyebrow text-signal">{s.tag}</span>
                  </div>
                  <p className="text-paper/90 leading-relaxed">{s.summary}</p>
                  <p className="mt-3 text-dim leading-relaxed text-[15px]">
                    {s.detail}
                  </p>
                  {s.costNote && (
                    <p className="mt-3 font-mono text-xs text-dim border-t border-line pt-3">
                      {s.costNote}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

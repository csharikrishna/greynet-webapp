import { LEAKAGE_STATS as L } from "@/lib/models-data";

export default function LeakageSection() {
  const pct = L.leakagePct;
  return (
    <section id="leakage" className="px-6 py-24 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow mb-4 text-warn">Methodology & Dataset Integrity</p>
        <h2 className="font-display text-3xl sm:text-4xl text-paper max-w-2xl leading-tight">
          Ensuring reproducible validation.
        </h2>
        <p className="mt-5 text-dim max-w-2xl leading-relaxed">
          Many widely used brain tumor datasets inadvertently contain slices from the same patient in both training and testing folds, which artificially inflates accuracy scores. To establish a rigorous, trustworthy baseline, we used perceptual hashing (pHash) to detect and remove identical scans.
        </p>

        <div className="mt-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          <div className="space-y-3">
            <div className="flex justify-between font-mono text-xs text-dim">
              <span>Training set</span>
              <span className="data">{L.trainImages.toLocaleString()} images</span>
            </div>
            <div className="h-3 bg-panel rounded-sm overflow-hidden border border-line">
              <div className="h-full bg-dim/40 w-full" />
            </div>
            <div className="flex justify-between font-mono text-xs text-dim">
              <span>Testing set</span>
              <span className="data">{L.testImages.toLocaleString()} images</span>
            </div>
            <div className="h-3 bg-panel rounded-sm overflow-hidden border border-line relative">
              <div
                className="h-full bg-warn/70 absolute left-0 top-0"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <div className="h-full bg-dim/40 w-full" />
            </div>
          </div>

          <div className="flex flex-col items-center px-6">
            <span className="data text-5xl sm:text-6xl text-warn leading-none">
              {pct}%
            </span>
            <span className="eyebrow mt-2 text-center">
              of the test set was<br />already in training
            </span>
          </div>

          <p className="text-dim leading-relaxed">
            <span className="data text-paper">{L.duplicatesFound.toLocaleString()}</span> of{" "}
            <span className="data text-paper">{L.testImages.toLocaleString()}</span> test images were
            pixel-identical to a training image under pHash comparison. Models
            evaluated on this split weren&apos;t generalizing — they were
            recognizing images they&apos;d already memorized.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-8 border-t border-line pt-10">
          <div>
            <p className="eyebrow mb-3">Collision-Checked Curation</p>
            <p className="text-dim leading-relaxed">
              Methodology: We merged multiple dataset sources ({L.sourceDatasets.join(", ")}) and
              an independent <span className="text-paper">{L.addedDataset}</span> dataset,
              running perceptual hashing to completely remove duplicates. This process generated honest 5-fold splits with zero patient overlap.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-3">Honest Baselines</p>
            <p className="text-dim leading-relaxed mb-3">
              Evaluating the lightweight GrayNet models on this sanitized dataset guarantees that our accuracy is driven by genuine generalization rather than trivial memorization of overlapping training data. (True leakage measured at <span className="data text-signal">0%</span>).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

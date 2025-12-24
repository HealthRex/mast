"use client";

import clsx from "clsx";

interface NoharmInfoCardProps {
  className?: string;
}

export function NoharmInfoCard({ className }: NoharmInfoCardProps) {
  return (
    <section
      className={clsx(
        "flex flex-col gap-5 rounded-2xl bg-[#f4f4f5] p-5 text-sm text-slate-600 h-[650px] overflow-y-auto",
        className
      )}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">The NOHARM Benchmark</h2>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Benchmark overview
        </p>
      </header>
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">About</dt>
          <dd>
            NOHARM is a physician-validated medical benchmark to evaluate the accuracy and safety of
            AI-generated medical recommendations, grounded in real medical cases. The current version covers 10
            specialties across 100 cases, and includes 12,747 specialist annotations on beneficial and
            harmful medical actions that can be taken in the 100 cases. This project is led and supported by the ARISE AI Research Network, based
            at Stanford and Harvard.
          </dd>
        </div>
                <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivation</dt>
          <dd>
            As physicians, one of our core principles is to do no harm. With the rapid integration of AI technologies into medicine, how can we evaluate the harm of technologies? How do we evaluate how these models perform, compared to each other, and importantly, to ourselves?
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study</dt>
          <dd>
            For details, see{" "}
            <a
              href="https://arxiv.org/abs/2512.01241"
              className="font-medium text-brand-600 hover:text-brand-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              our study
            </a>
            .
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submissions</dt>
          <dd>
            An automated submission portal is in the works. In the meanwhile, please contact us if you
            are interested benchmarking your model and inclusion in the leaderboard.
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</dt>
          <dd>
            <a
              href="https://forms.gle/MD94gF5Ro8wo7N8y7"
              className="font-medium text-brand-600 hover:text-brand-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Reach out to our team.
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}

'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { EXPERIENCE_STAGES, TimelineSnapshot } from '@/data/experience';

interface ProgressIndicatorProps {
  timeline: TimelineSnapshot;
  onJumpToProgress: (target: number) => void;
}

export function ProgressIndicator({
  timeline,
  onJumpToProgress,
}: ProgressIndicatorProps) {
  const percent = Math.round(timeline.scrollProgress * 100)
    .toString()
    .padStart(2, '0');
  const growthPercent = Math.round(timeline.treeGrowth * 100);
  const currentStage =
    EXPERIENCE_STAGES[timeline.stageIndex] || EXPERIENCE_STAGES[0];

  return (
    <>
      {/* Left Vertical Botanical Timeline Rail */}
      <aside
        aria-label="Growth timeline progress"
        className="pointer-events-none fixed bottom-10 left-6 top-28 z-20 hidden flex-col justify-between md:flex md:left-10"
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8c968e]">
            SCROLL CHRONICLE
          </span>
          <span className="font-display text-2xl font-light tracking-wider text-[#f3efe6]">
            {percent}%
          </span>
        </div>

        {/* Hairline Progress Track */}
        <div className="relative my-4 flex flex-1 items-center pl-2">
          <div className="relative h-full w-[1px] bg-white/12">
            <div
              className="w-full bg-gradient-to-b from-[#78c88a] via-[#d4af37] to-[#f5e6c8] transition-all duration-150"
              style={{ height: `${timeline.scrollProgress * 100}%` }}
            />
          </div>

          <div className="pointer-events-auto ml-4 flex h-full flex-col justify-between py-1">
            {EXPERIENCE_STAGES.map((stage, idx) => {
              const active = timeline.stageIndex === idx;
              const passed = timeline.scrollProgress > stage.scrollRange[1];
              return (
                <button
                  key={stage.id}
                  onClick={() =>
                    onJumpToProgress(
                      stage.scrollRange[0] +
                        (stage.scrollRange[1] - stage.scrollRange[0]) * 0.25
                    )
                  }
                  className="group flex items-center gap-2.5 text-left focus:outline-none"
                  title={stage.label}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      active
                        ? 'scale-150 bg-[#e5c992] shadow-[0_0_8px_#d4af37]'
                        : passed
                        ? 'bg-[#78c88a]/70'
                        : 'bg-white/20 group-hover:bg-white/50'
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.18em] transition-opacity ${
                      active
                        ? 'text-[#f5e6c8] opacity-100'
                        : 'text-[#8c968e] opacity-45 group-hover:opacity-90'
                    }`}
                  >
                    {stage.stageNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8c968e]">
            BIOMASS MATURITY
          </span>
          <span className="font-mono text-xs tracking-[0.15em] text-[#a7d4b1]">
            {growthPercent}% GROWN
          </span>
        </div>
      </aside>

      {/* Bottom Editorial Stage Caption & Scroll Cue */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex flex-col items-center justify-center px-6 text-center">
        {timeline.activeBranchIndex === -1 && timeline.finaleFactor < 0.5 && (
          <div className="mb-3 max-w-xl rounded-2xl border border-white/10 bg-[#060907]/65 px-6 py-4 backdrop-blur-md transition-all duration-500">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
              {currentStage.label}
            </p>
            <h1 className="mt-1 font-display text-2xl font-normal italic tracking-wide text-[#f4efe4] sm:text-3xl">
              {currentStage.headline}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-[#b9c4bb] sm:text-sm">
              {currentStage.subheadline}
            </p>
          </div>
        )}

        {timeline.scrollProgress < 0.96 && (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9ba89d]/80">
            <span>
              {timeline.scrollProgress < 0.04
                ? 'SCROLL SLOWLY TO AWAKEN THE SEED'
                : timeline.activeBranchIndex !== -1
                ? 'SCROLL TO TRAVEL BETWEEN BRANCHES'
                : 'SCROLL TO GROW THROUGH TIME'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-[#d4af37]" />
          </div>
        )}
      </div>
    </>
  );
}

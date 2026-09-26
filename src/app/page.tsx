'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Sparkles } from 'lucide-react';
import { branches, BranchStoryData } from '@/data/branches';
import { EXPERIENCE_STAGES } from '@/data/experience';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useExperienceTimeline } from '@/hooks/useExperienceTimeline';
import { Navigation } from '@/components/ui/Navigation';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { BranchIndicator } from '@/components/ui/BranchIndicator';

const TreeScene = dynamic(
  () => import('@/components/experience/TreeScene').then((mod) => mod.TreeScene),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center bg-[#060907] text-[#f4efe4]">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/40 text-[#e5c992] animate-pulse">
          ✦
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-[#9ba89d]">
          AWAKENING LIVING 3D WORLD...
        </p>
      </div>
    ),
  }
);

export default function HomePage() {
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const { scrollRef, uiProgress, uiVelocity, scrollToProgress } =
    useScrollProgress(reducedMotion);
  const timeline = useExperienceTimeline(uiProgress, uiVelocity);

  const [selectedModalBranch, setSelectedModalBranch] =
    useState<BranchStoryData | null>(null);

  const handleJumpToBranchIndex = useCallback(
    (index: number) => {
      const b = branches[index];
      if (!b) return;
      // Jump right into the settled focus window of that branch
      const midTarget =
        b.scrollRange[0] + (b.scrollRange[1] - b.scrollRange[0]) * 0.52;
      scrollToProgress(midTarget);
    },
    [scrollToProgress]
  );

  const handleSelectBranchFrom3D = useCallback(
    (branch: BranchStoryData) => {
      const idx = branches.findIndex((b) => b.id === branch.id);
      if (idx !== -1 && timeline.activeBranchIndex !== idx) {
        handleJumpToBranchIndex(idx);
      }
      setSelectedModalBranch(branch);
    },
    [handleJumpToBranchIndex, timeline.activeBranchIndex]
  );

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedModalBranch) {
        setSelectedModalBranch(null);
        return;
      }
      if (selectedModalBranch) return;

      if (e.key === 'ArrowRight') {
        const nextIdx =
          timeline.activeBranchIndex >= 0
            ? (timeline.activeBranchIndex + 1) % branches.length
            : 0;
        handleJumpToBranchIndex(nextIdx);
      } else if (e.key === 'ArrowLeft' && timeline.activeBranchIndex >= 0) {
        const prevIdx =
          (timeline.activeBranchIndex - 1 + branches.length) % branches.length;
        handleJumpToBranchIndex(prevIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleJumpToBranchIndex,
    selectedModalBranch,
    timeline.activeBranchIndex,
  ]);

  return (
    <main className="relative min-h-[1150vh] w-full select-none bg-[#060907]">
      {/* Fixed Continuous 3D WebGL World */}
      <TreeScene
        scrollRef={scrollRef}
        reducedMotion={reducedMotion}
        onSelectBranch={handleSelectBranchFrom3D}
      />

      {/* Minimal Top Navigation & Telemetry */}
      <Navigation
        timeline={timeline}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        onJumpToProgress={scrollToProgress}
      />

      {/* Left Hairline Progress Rail & Bottom Stage Caption */}
      <ProgressIndicator
        timeline={timeline}
        onJumpToProgress={scrollToProgress}
      />

      {/* Branch Exploration HUD & Specimen Modal */}
      <BranchIndicator
        timeline={timeline}
        selectedModalBranch={selectedModalBranch}
        onCloseModal={() => setSelectedModalBranch(null)}
        onSelectModalBranch={setSelectedModalBranch}
        onJumpToBranchIndex={handleJumpToBranchIndex}
      />

      {/* FINAL HERO MOMENT OVERLAY (95% -> 100% Scroll) */}
      {timeline.finaleFactor > 0.35 && (
        <section
          aria-label="Full tree finale"
          style={{ opacity: timeline.finaleFactor }}
          className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between px-6 pb-10 pt-24 text-center transition-opacity duration-300"
        >
          {/* Starlight Sacred Geometry Header */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6 text-xs text-[#d4af37]/80">
              <span>✦</span>
              <span className="text-base text-[#f5e6c8]">✦</span>
              <span>✦</span>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.34em] text-[#e5c992]">
              COMPLETE ARCHITECTURE · FULL TREE REVEAL
            </p>
          </div>

          {/* Center remains clear so the illuminated 3D Tree is the undisputed hero */}
          <div className="my-auto" />

          {/* Restrained Finale Statement & Actions */}
          <div className="pointer-events-auto max-w-2xl rounded-2xl border border-[#d4af37]/30 bg-[#070b08]/78 px-7 py-6 shadow-2xl backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#84cc8e]">
              GROWTH
            </p>
            <h2 className="mt-1 font-display text-3xl font-light italic tracking-wide text-[#f4efe4] sm:text-5xl">
              “Everything Starts Small.”
            </h2>
            <p className="mx-auto mt-2.5 max-w-lg text-xs leading-relaxed text-[#b9c4bb] sm:text-sm">
              Growth is not a straight line. It is a living constellation of
              branches, quiet seasons, and suspended memories that eventually
              form something timeless.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleJumpToBranchIndex(0)}
                className="flex items-center gap-2 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f5e6c8] transition-all hover:bg-[#d4af37]/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                EXPLORE BRANCH STORIES
              </button>
              <button
                onClick={() => scrollToProgress(0)}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c9d2cb] transition-all hover:border-white/35 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                RETURN TO SEED
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Accessible Screen-Reader Narrative Structure */}
      <div className="sr-only">
        <h1>ARBOREA — Immersive 3D Tree Growth Experience</h1>
        {EXPERIENCE_STAGES.map((stage) => (
          <section key={stage.id}>
            <h2>
              {stage.stageNumber}: {stage.headline}
            </h2>
            <p>{stage.subheadline}</p>
            <p>{stage.poeticNote}</p>
          </section>
        ))}
        <section>
          <h2>Suspended Branch Stories</h2>
          <ul>
            {branches.map((b) => (
              <li key={b.id}>
                <h3>
                  {b.index} — {b.title} ({b.subtitle})
                </h3>
                <p>{b.description}</p>
                <p>{b.extendedStory}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

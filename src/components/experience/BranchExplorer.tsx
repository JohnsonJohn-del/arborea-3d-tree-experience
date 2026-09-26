'use client';

import React, { Suspense } from 'react';
import { branches, BranchStoryData } from '@/data/branches';
import { ScrollStateRef } from '@/hooks/useScrollProgress';
import { HangingCard } from './HangingCard';

interface BranchExplorerProps {
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  reducedMotion: boolean;
  onSelectBranch: (branch: BranchStoryData) => void;
}

export function BranchExplorer({
  scrollRef,
  reducedMotion,
  onSelectBranch,
}: BranchExplorerProps) {
  return (
    <group name="branch-explorer-cards">
      <Suspense fallback={null}>
        {branches.map((branch, idx) => (
          <HangingCard
            key={branch.id}
            branch={branch}
            index={idx}
            scrollRef={scrollRef}
            reducedMotion={reducedMotion}
            onSelectBranch={onSelectBranch}
          />
        ))}
      </Suspense>
    </group>
  );
}

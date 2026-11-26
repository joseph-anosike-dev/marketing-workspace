import { SECTION_LABELS, type Section } from '@/types'
import { stageLabel, type PromptEntry, type StageId } from './types'

const badge = 'rounded-full border px-2 py-0.5 text-xs'

export function EntryBadges({ entry }: { entry: { kind: PromptEntry['kind']; section: Section; stage: StageId } }) {
  return (
    <p className="flex flex-wrap gap-1.5">
      {entry.kind === 'ai-prompt' && (
        <span className={`${badge} border-primary bg-primary text-primary-foreground`}>Optional AI</span>
      )}
      <span className={badge}>{SECTION_LABELS[entry.section]}</span>
      <span className={`${badge} text-muted-foreground`}>{stageLabel(entry.stage)}</span>
    </p>
  )
}

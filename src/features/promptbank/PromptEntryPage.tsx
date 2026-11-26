import { Link, useParams } from 'react-router-dom'
import { AiPromptView } from './AiPromptView'
import { getEntry } from './content'
import { GuideView } from './GuideView'

export function PromptEntryPage() {
  const { entryId } = useParams()
  const entry = getEntry(entryId)

  if (!entry) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Entry not found</h1>
        <Link to="/prompts" className="mt-2 inline-block underline">
          Go to the Prompt Bank
        </Link>
      </div>
    )
  }

  // A new entry starts with fresh ticks and paste boxes.
  return entry.kind === 'guide' ? (
    <GuideView key={entry.id} entry={entry} />
  ) : (
    <AiPromptView key={entry.id} entry={entry} />
  )
}

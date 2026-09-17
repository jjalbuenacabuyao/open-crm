import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/')({
  staticData: { title: 'Dashboard' },
  component: Home,
})

/**
 * The landing page inside the shell. Deliberately empty — these are the block's
 * placeholder regions, waiting for the first real dashboard content.
 */
function Home() {
  return (
    <>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
      </div>
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
    </>
  )
}

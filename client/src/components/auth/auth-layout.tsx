import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

import type { ReactNode } from 'react'

/** Full-page chrome for the auth screens, which render outside the app shell. */
export function AuthLayout({
  heading,
  subheading,
  footer,
  children,
}: {
  heading: string
  subheading: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <span
          className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-semibold"
          aria-hidden="true"
        >
          C
        </span>
        <span className="text-lg font-semibold tracking-tight">open-crm</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{subheading}</CardDescription>
        </CardHeader>

        <CardContent>{children}</CardContent>

        {footer ? (
          <CardFooter className="justify-center">{footer}</CardFooter>
        ) : null}
      </Card>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { LoaderCircle } from 'lucide-react'
import { z } from 'zod'

import { AuthField } from '#/components/auth/auth-field.tsx'
import { AuthLayout } from '#/components/auth/auth-layout.tsx'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import { authErrorMessage } from '#/lib/auth-error.ts'
import { signIn, useAuth } from '#/lib/auth.ts'
import { getMe } from '#/lib/api.ts'

/** Where to land when the URL asks for nothing in particular. */
const DEFAULT_REDIRECT = '/'

function safeRedirect(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return undefined
  }
  return value
}

const credentials = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .pipe(z.email('Enter a valid email address.')),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Passwords are at least 8 characters.'),
})

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = safeRedirect(search.redirect)
    return target ? { redirect: target } : {}
  },
  head: () => ({ meta: [{ title: 'Sign in · open-crm' }] }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const redirectTo = redirect ?? DEFAULT_REDIRECT
  const { status } = useAuth()
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate({ href: redirectTo, replace: true })
    }
  }, [status, redirectTo, navigate])

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: credentials },
    onSubmit: async ({ value }) => {
      setServerError('')

      try {
        await signIn({ email: value.email.trim(), password: value.password })

        await getMe().catch((error: unknown) => {
          console.error('Failed to load profile after sign in', error)
        })

        await navigate({ href: redirectTo, replace: true })
      } catch (error: unknown) {
        setServerError(authErrorMessage(error))
      }
    },
  })

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to your open-crm workspace."
      footer={
        <p className="text-muted-foreground text-sm">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      }
    >
      {serverError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Could not sign you in</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <AuthField
              field={field}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <AuthField
              field={field}
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              Sign in
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthLayout>
  )
}

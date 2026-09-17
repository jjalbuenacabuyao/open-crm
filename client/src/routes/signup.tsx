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
import { signUp, useAuth } from '#/lib/auth.ts'
import { registerProfile } from '#/lib/api.ts'

const account = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required.')
      .max(100, 'First name is too long.'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required.')
      .max(100, 'Last name is too long.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .pipe(z.email('Enter a valid email address.')),
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const Route = createFileRoute('/signup')({
  head: () => ({ meta: [{ title: 'Create an account · open-crm' }] }),
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { status } = useAuth()
  const [serverError, setServerError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate({ to: '/', replace: true })
    }
  }, [status, navigate])

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: account },
    onSubmit: async ({ value }) => {
      setServerError('')
      setEmailTaken(false)
      setConfirmationEmail('')

      const email = value.email.trim()
      const firstName = value.firstName.trim()
      const lastName = value.lastName.trim()

      try {
        const result = await signUp({
          email,
          password: value.password,
          firstName,
          lastName,
        })

        if (result.emailTaken) {
          setEmailTaken(true)
          return
        }

        if (!result.session) {
          // Email confirmation is on: there is no access token yet, so the API
          // cannot be called. The names are already in user_metadata, and
          // /auth/me provisions the row once the user confirms.
          setConfirmationEmail(email)
          return
        }

        // Non-fatal: /auth/me provisions the same row on demand.
        await registerProfile({ firstName, lastName }).catch(
          (error: unknown) => {
            console.error('Failed to create profile after sign up', error)
          },
        )

        await navigate({ to: '/', replace: true })
      } catch (error: unknown) {
        setServerError(authErrorMessage(error))
      }
    },
  })

  const signInLink = (
    <Link
      to="/login"
      className="text-foreground font-medium underline underline-offset-4"
    >
      Sign in
    </Link>
  )

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Start managing your pipeline in open-crm."
      footer={
        <p className="text-muted-foreground text-sm">
          Already have an account? {signInLink}
        </p>
      }
    >
      {emailTaken ? (
        <Alert>
          <AlertTitle>That email is already registered</AlertTitle>
          <AlertDescription>
            <span>
              An account already exists for this address. {signInLink}
            </span>
          </AlertDescription>
        </Alert>
      ) : confirmationEmail ? (
        <Alert>
          <AlertTitle>Confirm your email</AlertTitle>
          <AlertDescription>
            We sent a confirmation link to {confirmationEmail}. Open it to
            finish setting up your account, then sign in.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {serverError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Could not create your account</AlertTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="firstName">
                {(field) => (
                  <AuthField
                    field={field}
                    label="First name"
                    autoComplete="given-name"
                  />
                )}
              </form.Field>

              <form.Field name="lastName">
                {(field) => (
                  <AuthField
                    field={field}
                    label="Last name"
                    autoComplete="family-name"
                  />
                )}
              </form.Field>
            </div>

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
                  autoComplete="new-password"
                  description="At least 8 characters."
                />
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <AuthField
                  field={field}
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
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
                  Create account
                </Button>
              )}
            </form.Subscribe>
          </form>
        </>
      )}
    </AuthLayout>
  )
}

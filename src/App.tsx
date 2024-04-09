import {
  QueryErrorBoundary,
  SuspenseQuery,
  queryOptions,
} from '@suspensive/react-query'
import './App.css'
import axios, { AxiosError } from 'axios'
import {
  ErrorBoundary,
  Suspense,
  useErrorBoundaryFallbackProps,
} from '@suspensive/react'
import { z, ZodError } from 'zod'
import { useForm } from 'react-hook-form'
import { DevTool } from '@hookform/devtools'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocalStorage, useTimeout } from 'usehooks-ts'

const githubUserSchema = z.object({
  login: z.string(),
  id: z.number().int().min(1),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.string().nullable(),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: z.string().url(),
  gists_url: z.string().url(),
  starred_url: z.string().url(),
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string().url(),
  received_events_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
  name: z.string().nullable(),
  company: z.string().nullable(),
  blog: z.string().nullable(),
  location: z.string().nullable(),
  email: z.string().nullable(),
  hireable: z.boolean().nullable(),
  bio: z.string().nullable(),
  twitter_username: z.string().nullable(),
  public_repos: z.number().int(),
  public_gists: z.number().int(),
  followers: z.number().int(),
  following: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

const query = {
  githubUser: (username: string) =>
    queryOptions({
      queryKey: ['github', 'usernames', username] as const,
      queryFn: () =>
        axios
          .get(`https://api.github.com/users/${username}`)
          .then(({ data }) => data),
    }),
}

const formSchema = z.object({
  username: z.string().min(1),
  realname: z.string().min(1),
})

function App() {
  const [githubCoAuthors, setGithubCoAuthors] = useLocalStorage<
    Array<z.infer<typeof formSchema>>
  >('Co-author Generator(GitHub)', [])
  const { register, control, handleSubmit, reset } = useForm<
    z.infer<typeof formSchema>
  >({
    defaultValues: { username: '', realname: '' },
    resolver: zodResolver(formSchema),
  })

  return (
    <>
      <h1 style={{ fontSize: 40, wordBreak: 'break-word' }}>
        Co-author Generator (GitHub)
      </h1>

      <form
        action="submit"
        onSubmit={handleSubmit((formData) => {
          setGithubCoAuthors((prev) => [
            ...prev.filter(({ username }) => username !== formData.username),
            formData,
          ])
          reset()
        })}
        style={{ textAlign: 'left' }}
      >
        <div>
          <div>
            <label htmlFor="username" style={{ fontWeight: 700 }}>
              GitHub Username
            </label>
          </div>
          <span style={{ display: 'block' }}>
            <input
              style={{ width: '100%', fontSize: 18 }}
              id="username"
              type="text"
              placeholder="manudeli"
              {...register('username')}
            />
          </span>
        </div>
        <br />
        <div>
          <div>
            <label htmlFor="realname" style={{ fontWeight: 700 }}>
              Display Name
            </label>
          </div>
          <span style={{ display: 'block' }}>
            <input
              style={{ width: '100%', fontSize: 18 }}
              id="realname"
              type="text"
              placeholder="Jonghyeon Ko"
              {...register('realname')}
            />
          </span>
        </div>
        <br />
        <button style={{ width: '100%' }} type="submit">
          Add as Co-author
        </button>
      </form>
      <br />
      {githubCoAuthors.length > 0
        ? '⌨️ Copy & Paste on commit message ⌨️'
        : null}
      <section
        style={{ border: '1px solid white', padding: 12, borderRadius: 8 }}
      >
        {githubCoAuthors.length === 0 ? (
          <p style={{ opacity: 0.6 }}>
            Please add new one as Co-author by upper form
          </p>
        ) : null}
        {githubCoAuthors.map(({ realname, username }) => (
          <div key={username} style={{ textAlign: 'left' }}>
            <QueryErrorBoundary
              shouldCatch={AxiosError}
              fallback={() => (
                <AxiosErrorBoundaryFallback
                  username={username}
                  onRemove={() =>
                    setGithubCoAuthors((prev) =>
                      prev.filter((authors) => authors.username !== username)
                    )
                  }
                />
              )}
            >
              <ErrorBoundary
                shouldCatch={ZodError}
                fallback={ZodErrorBoundaryFallback}
              >
                <Suspense fallback={'loading...'}>
                  <SuspenseQuery
                    {...query.githubUser(username)}
                    select={githubUserSchema.parse}
                  >
                    {({ data: githubUser }) => (
                      <>{`Co-authored-by: ${realname} <${githubUser.id}+${username}@users.noreply.github.com>`}</>
                    )}
                  </SuspenseQuery>
                </Suspense>
                <button
                  onClick={() =>
                    setGithubCoAuthors((prev) =>
                      prev.filter((authors) => authors.username !== username)
                    )
                  }
                  style={{ fontSize: 12, userSelect: 'none', marginLeft: 8 }}
                >
                  🗑️
                </button>
              </ErrorBoundary>
            </QueryErrorBoundary>
          </div>
        ))}
      </section>
      <DevTool control={control} />
    </>
  )
}

export default App

const AxiosErrorBoundaryFallback = ({
  username,
  onRemove,
}: {
  username: string
  onRemove: () => void
}) => {
  const { error } = useErrorBoundaryFallbackProps()

  useTimeout(() => {
    onRemove()
  }, 1500)

  if (error instanceof AxiosError) {
    return (
      <>
        {username}: {error.message} (This will be disappear after 1.5s)
        <button
          style={{ fontSize: 12, userSelect: 'none', marginLeft: 8 }}
          onClick={onRemove}
        >
          🗑️
        </button>
      </>
    )
  }
}

const ZodErrorBoundaryFallback = () => {
  const { error } = useErrorBoundaryFallbackProps()
  if (error instanceof ZodError) {
    return (
      <div>
        <h2>zod error</h2>
        <ul style={{ textAlign: 'left' }}>
          {error.issues.map((issue) => {
            return (
              <li>
                {issue.path}: code: {issue.code} ({issue.message})
              </li>
            )
          })}
        </ul>
        {JSON.stringify(error)}
      </div>
    )
  }
}

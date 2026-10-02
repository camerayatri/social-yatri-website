-- The admin's tables. Applied once, in order, by scripts/migrate.mjs, which
-- records each file it has run in schema_migrations and wraps it in a
-- transaction, so a failure leaves nothing half-made.

-- People who can sign in. Emails are stored lower case and compared that way.
-- must_change_password is set for an account created with a temporary
-- password, and cleared when its owner chooses their own.
CREATE TABLE maintainers (
  id                   serial PRIMARY KEY,
  email                text NOT NULL UNIQUE CHECK (email = lower(email)),
  name                 text NOT NULL,
  password_hash        text NOT NULL,
  disabled             boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  last_login_at        timestamptz
);

-- Signed-in browsers. The cookie carries a random id; only its SHA-256 is
-- stored, so a copy of this table cannot be replayed as a cookie. Removing a
-- maintainer removes their sessions with them.
CREATE TABLE sessions (
  id_hash       text PRIMARY KEY,
  maintainer_id int NOT NULL REFERENCES maintainers(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  ip            text,
  ua            text
);
CREATE INDEX sessions_maintainer_idx ON sessions (maintainer_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- One row per content key (site, hero, works...). version is the optimistic
-- lock: a save names the version it started from and fails if it moved.
CREATE TABLE content_docs (
  key        text PRIMARY KEY,
  data       jsonb NOT NULL,
  version    int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by int REFERENCES maintainers(id) ON DELETE SET NULL
);

-- The copy each save replaced, newest twenty per key.
CREATE TABLE content_revisions (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  version    int NOT NULL,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by int REFERENCES maintainers(id) ON DELETE SET NULL
);
CREATE INDEX content_revisions_key_idx ON content_revisions (key, id DESC);

-- Every file content can point at. source 'seed' is a file shipped in
-- public/ and registered by the seed; 'blob' is an upload. Deletion is soft
-- (deleted_at) so a revision that still names the file can be restored.
CREATE TABLE media (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('image', 'video')),
  url        text NOT NULL UNIQUE,
  pathname   text,
  poster_url text,
  w          int,
  h          int,
  duration   real,
  bytes      bigint,
  mime       text,
  alt        text NOT NULL,
  source     text NOT NULL CHECK (source IN ('blob', 'seed')),
  created_by int REFERENCES maintainers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX media_live_idx ON media (created_at DESC) WHERE deleted_at IS NULL;

-- Fixed-window counters: bucket names what is counted ("login:email:...",
-- "login:ip:...", "contact:ip:..."), window_start the window it fell in.
CREATE TABLE rate_limits (
  bucket       text NOT NULL,
  window_start timestamptz NOT NULL,
  count        int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- The contact form's submissions. The IP is kept only as a salted hash, for
-- rate limiting and spotting repeat senders.
CREATE TABLE contact_submissions (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL,
  company    text,
  phone      text,
  email      text NOT NULL,
  need       text,
  message    text,
  ip_hash    text,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_submissions_created_idx ON contact_submissions (created_at DESC);

-- Who did what. actor_email is copied in so the trail survives the
-- maintainer being removed.
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor       int REFERENCES maintainers(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,
  target      text,
  detail      jsonb
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);

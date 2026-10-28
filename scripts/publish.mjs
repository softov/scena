// Cut a release of @softov/scena.
//
// The publish itself happens in CI, on the tag (.github/workflows/release.yml):
// staged on npmjs until somebody approves it there, a copy on GitHub Packages,
// and a GitHub Release. npmjs is the one consumers resolve from, because GitHub
// Packages demands an auth header on every read.
//
// Two steps, as ahpc and ahpd release. The bump is a pull request; the tag is
// cut from main once it is merged:
//
//   node scripts/publish.mjs patch          1.2.3 -> 1.2.4 on a branch release/v1.2.4
//   node scripts/publish.mjs minor
//   node scripts/publish.mjs 2.0.0-rc.1     an exact version
//   node scripts/publish.mjs patch --push   also push the branch, for its pull request
//   node scripts/publish.mjs patch --dry-run
//   node scripts/publish.mjs tag            tag main's version once the bump is merged
//   node scripts/publish.mjs tag --push     also push the tag, which stages the publish
//
// Both run the same four checks the release workflow runs, so a release that
// would fail in CI fails here instead - before the version is bumped, and
// before the tag exists.
//
// It deliberately does NOT publish. Doing both would race the workflow.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgRoot = join(repoRoot, 'packages', 'scena');
const manifestPath = join(pkgRoot, 'package.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const push = args.includes('--push');
const request = args.find((arg) => !arg.startsWith('--'));

function run(command, commandArgs, options = {}) {
  // pnpm and npm on Windows are `.cmd` shims, which execFileSync cannot exec
  // directly, so they go through cmd.exe. Named, rather than `shell: true`:
  // Node deprecates passing arguments with that (DEP0190), and a shell must
  // not see anything else, because it re-splits every argument on whitespace.
  // `git commit -m "release: @softov/scena v0.1.1"` then arrives as four words,
  // and git reads the last two as pathspecs. Only single-word arguments go to
  // the shims.
  const shim = process.platform === 'win32' && (command === 'pnpm' || command === 'npm');
  const [file, fileArgs] = shim ? [process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', command, ...commandArgs]] : [command, commandArgs];
  return execFileSync(file, fileArgs, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.capture === true ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
}

function fail(message) {
  console.error(`\nrelease: ${message}`);
  process.exit(1);
}

function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+/u.test(bump)) return bump;
  const [major, minor, patch] = current.split('-')[0].split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  return null;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const registry = manifest.publishConfig?.registry;

if (request === undefined) fail('say which version: patch, minor, major, an exact X.Y.Z, or tag');
// `tag` releases the version main already carries; anything else bumps it.
const tagging = request === 'tag';
const version = tagging ? manifest.version : nextVersion(manifest.version, request);
if (version === null) fail(`"${request}" is not patch, minor, major, a version, or tag`);

console.log(
  tagging
    ? `release: tag ${manifest.name} ${version}`
    : `release: ${manifest.name} ${manifest.version} -> ${version}`,
);
console.log(`release: stages on ${registry ?? '(no publishConfig!)'} when the tag lands\n`);

// ── Where it would go ─────────────────────────────────────────────────────
// Without publishConfig, npm defaults to public npmjs. scena is private, and an
// accidental public publish is not something an unpublish really takes back.
if (registry === undefined) {
  fail('packages/scena/package.json has no publishConfig.registry - refusing to guess');
}

// ── What would go ─────────────────────────────────────────────────────────
if (!existsSync(join(pkgRoot, 'LICENSE'))) {
  fail('packages/scena/LICENSE is missing, and package.json declares a license');
}

// ── A clean tree at the tip ───────────────────────────────────────────────
// The tag has to name a commit somebody can check out and get this exact
// package from. Uncommitted work makes that untrue, and tagging a commit that
// is behind origin tags the wrong one.
const status = run('git', ['status', '--porcelain'], { capture: true }).trim();
if (status !== '') fail(`working tree is dirty - commit or stash first:\n${status}`);

run('git', ['fetch', '--tags', '--quiet']);
try {
  const behind = run('git', ['rev-list', '--count', 'HEAD..@{upstream}'], { capture: true }).trim();
  if (behind !== '0') fail(`local branch is ${behind} commit(s) behind upstream - pull first`);
} catch (error) {
  // A branch with no upstream is a legitimate place to cut from - a fork, a
  // fresh clone of a maintenance branch - so this is a warning, not a stop.
  // Anything git says other than "no upstream" still stops it.
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  if (!/no upstream|does not point to a branch/iu.test(output)) throw error;
  console.warn('release: branch has no upstream, skipping the behind-check');
}

// The tag names what is on origin's main: the merged bump, nothing local.
if (tagging) {
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).trim();
  if (branch !== 'main') fail(`tag from main, not ${branch}`);
  const ahead = run('git', ['rev-list', '--count', 'origin/main..HEAD'], { capture: true }).trim();
  if (ahead !== '0') fail(`main is ${ahead} commit(s) ahead of origin - the tag must name a pushed commit`);
}

const tag = `v${version}`;
const existing = run('git', ['tag', '--list', tag], { capture: true }).trim();
if (existing !== '') fail(`tag ${tag} already exists`);

// ── Not already on the registry ───────────────────────────────────────────
try {
  const published = run(
    'npm',
    ['view', `${manifest.name}@${version}`, 'version', '--registry', registry],
    { capture: true },
  ).trim();
  if (published !== '') fail(`${manifest.name}@${version} is already published`);
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  // E404 is the answer we want - nothing published under this version yet.
  // Anything else (no auth, no network, wrong registry) is not a green light:
  // treating it as one is how a run gets all the way to a confusing CI failure.
  if (!/E404|404 Not Found/u.test(output)) {
    fail(`could not query ${registry}:\n${output.trim()}`);
  }
}

// ── The same four the release workflow runs ───────────────────────────────
// Run here so a release that would fail in CI fails before the tag exists,
// rather than after - a pushed tag that failed to publish has to be deleted
// from the remote before it can be retried.
run('pnpm', ['typecheck']);
run('pnpm', ['lint']);
run('pnpm', ['test']);
run('pnpm', ['build']);

// ── What the tarball actually contains ────────────────────────────────────
// `--json`, because `npm pack --dry-run` prints its file listing to STDERR as
// `npm notice` lines and puts only the tarball name on stdout - so reading
// stdout for filenames finds none of them and every check "fails". With --json
// the manifest is on stdout, and the paths are exact rather than substrings.
// npm 12 reports one object keyed by package name; every npm before it
// reported a one-element array. Both are read, because which one arrives
// depends on the machine cutting the release rather than on anything here.
const report = JSON.parse(
  run('npm', ['pack', '--dry-run', '--json'], { capture: true, cwd: pkgRoot }),
);
const packed = Array.isArray(report) ? report[0] : Object.values(report)[0];
if (packed === undefined) {
  fail('npm pack --dry-run --json described no package - cannot check the tarball');
}
const paths = packed.files.map((file) => file.path);

for (const required of ['LICENSE', 'README.md']) {
  if (!paths.includes(required)) fail(`tarball is missing ${required}`);
}
if (!paths.some((path) => path.startsWith('dist/'))) {
  fail('tarball has no dist/ - the build emitted nothing');
}
// `files` is an allowlist, so this only trips if somebody widened it.
const leaked = paths.filter((path) => path.startsWith('src/'));
if (leaked.length > 0) {
  fail(`tarball contains src/ - check the \`files\` field:\n  ${leaked.slice(0, 5).join('\n  ')}`);
}
console.log(
  `release: ${packed.name}@${packed.version} - ${packed.entryCount} files, `
  + `${(packed.size / 1024).toFixed(1)} kB packed / ${(packed.unpackedSize / 1024).toFixed(1)} kB unpacked`,
);

if (dryRun) {
  console.log(`\nrelease: --dry-run. Nothing written, nothing tagged.`);
  process.exit(0);
}

const packageName = manifest.name;

// ── Tag main ──────────────────────────────────────────────────────────────
if (tagging) {
  run('git', ['tag', '-a', tag, '-m', `${packageName} ${tag}`]);
  if (!push) {
    // Not pushed by default: pushing the tag is what starts the release.
    console.log(`\nrelease: tagged ${tag}, not pushed. Pushing it stages the publish:\n`);
    console.log(`  git push origin ${tag}`);
    process.exit(0);
  }
  run('git', ['push', 'origin', tag]);
  console.log(`\nrelease: pushed ${tag}. When the Release workflow is done, approve it at`);
  console.log(`  https://www.npmjs.com/package/${packageName}`);
  process.exit(0);
}

// ── Bump on a branch, for a pull request ──────────────────────────────────
// Everything above this line is read-only, so a failure there leaves nothing
// behind. From here it does not, so the branch, the write and the commit undo
// themselves as one.
const original = readFileSync(manifestPath, 'utf8');
const start = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).trim();
const branch = `release/${tag}`;
try {
  run('git', ['switch', '--quiet', '-c', branch]);
  manifest.version = version;
  // The trailing newline is preserved, so the release commit is a one-line diff.
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  run('git', ['add', 'packages/scena/package.json']);
  run('git', ['commit', '-m', `release: ${packageName} ${tag}`]);
} catch (error) {
  writeFileSync(manifestPath, original);
  run('git', ['reset', '--quiet', 'HEAD', '--', 'packages/scena/package.json']);
  run('git', ['switch', '--quiet', start]);
  run('git', ['branch', '--quiet', '-D', branch]);
  fail(`could not commit the bump, version left at ${JSON.parse(original).version}:\n${error.message}`);
}

if (push) run('git', ['push', '--quiet', '-u', 'origin', branch]);
console.log(`\nrelease: bumped to ${version} on ${branch}${push ? ', pushed' : ''}.`);
console.log(`release: open its pull request; once it is merged, on main:\n`);
console.log(`  git pull && pnpm release:tag --push`);

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

test('npm pack size and contents', () => {
  const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json', '--silent'], {
    cwd: repoRoot,
    timeout: 30000,
  })

  const raw = packOutput.toString()
  let packData
  try {
    packData = JSON.parse(raw)
  } catch {
    throw new Error(`npm pack --json output was not valid JSON:\n${raw}`)
  }

  assert(Array.isArray(packData), 'pack output should be a JSON array')
  assert(packData.length > 0, 'pack output should contain at least one entry')

  const { files, size } = packData[0]
  assert(Array.isArray(files), 'pack data should have a files array')

  // Check that size is reasonable (no build artifacts)
  assert(size < 500_000, `pack size ${size} should be less than 500,000 bytes`)

  // Extract paths from the files array
  const paths = files.map(f => f.path)

  // No entry path should match dist/ or .cache
  const hasBuildArtifacts = paths.some(path => /dist\/|\.cache/.test(path))
  assert(!hasBuildArtifacts, `pack should not contain dist/ or .cache artifacts. Found: ${paths.filter(p => /dist\/|\.cache/.test(p)).join(', ')}`)

  // Verify required paths are included
  const requiredPaths = [
    'examples/showcase/slides.json',
    'examples/showcase/deck.yaml',
    'examples/showcase/media/overlay.svg',
    'deck.d.ts',
    'schemas/slides.schema.json',
    'schemas/deck.schema.json',
    'bin/deck.js'
  ]

  for (const requiredPath of requiredPaths) {
    assert(paths.includes(requiredPath), `pack should include ${requiredPath}`)
  }
})

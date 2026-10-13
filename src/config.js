// deck.yaml → one config object. Defaults live HERE and nowhere else; the merge is
// explicit; an unknown key throws. Absence of deck.yaml IS the declared default deck.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

export const ROLES = ['draw', 'display', 'sans', 'mono', 'hand']
export const REMOTES = ['github-pages', 'codeberg-pages']

export const DEFAULTS = {
  theme: {
    background: '#ffffff', // stock Excalidraw canvas
    colors: {},            // extends the named-color table in src/build.js
    fonts: {},             // role → local woff2; absent roles stay Excalidraw's
  },
  behaviors: {
    tapZones: true,
    holdMs: 500,
    fullscreenButton: 'auto', // auto | true | false — auto shows it for coarse pointers only
  },
  deploy: null, // deploy is explicit: `deck deploy` without this section throws
}

function fail(msg) {
  throw new Error(`deck.yaml: ${msg}`)
}

function known(obj, allowed, where) {
  for (const key of Object.keys(obj)) if (!allowed.includes(key)) fail(`unknown key "${where}${key}" (known: ${allowed.join(', ')})`)
}

function str(value, where) {
  if (typeof value !== 'string' || !value) fail(`"${where}" must be a non-empty string, got ${JSON.stringify(value)}`)
  return value
}

function isMapping(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeTheme(raw) {
  if (!isMapping(raw)) fail(`"theme" must be a mapping, got ${JSON.stringify(raw)}`)
  known(raw, Object.keys(DEFAULTS.theme), 'theme.')
  const theme = structuredClone(DEFAULTS.theme)
  if ('background' in raw) theme.background = str(raw.background, 'theme.background')
  if ('colors' in raw) {
    if (!isMapping(raw.colors)) fail(`"theme.colors" must be a mapping, got ${JSON.stringify(raw.colors)}`)
    for (const [name, c] of Object.entries(raw.colors)) {
      known(c, ['stroke', 'fill'], `theme.colors.${name}.`)
      theme.colors[name] = {
        stroke: str(c.stroke, `theme.colors.${name}.stroke`),
        fill: str(c.fill, `theme.colors.${name}.fill`),
      }
    }
  }
  if ('fonts' in raw) {
    if (!isMapping(raw.fonts)) fail(`"theme.fonts" must be a mapping, got ${JSON.stringify(raw.fonts)}`)
    for (const [role, file] of Object.entries(raw.fonts)) {
      if (!ROLES.includes(role)) fail(`unknown font role "${role}" (roles: ${ROLES.join(', ')})`)
      theme.fonts[role] = str(file, `theme.fonts.${role}`)
    }
  }
  return theme
}

function mergeBehaviors(raw) {
  if (!isMapping(raw)) fail(`"behaviors" must be a mapping, got ${JSON.stringify(raw)}`)
  known(raw, Object.keys(DEFAULTS.behaviors), 'behaviors.')
  const behaviors = { ...DEFAULTS.behaviors }
  if ('tapZones' in raw) {
    if (typeof raw.tapZones !== 'boolean') fail(`"behaviors.tapZones" must be true or false, got ${JSON.stringify(raw.tapZones)}`)
    behaviors.tapZones = raw.tapZones
  }
  if ('holdMs' in raw) {
    if (!Number.isFinite(raw.holdMs) || raw.holdMs <= 0) fail(`"behaviors.holdMs" must be a positive number, got ${JSON.stringify(raw.holdMs)}`)
    behaviors.holdMs = raw.holdMs
  }
  if ('fullscreenButton' in raw) {
    if (![true, false, 'auto'].includes(raw.fullscreenButton)) fail(`"behaviors.fullscreenButton" must be auto, true or false, got ${JSON.stringify(raw.fullscreenButton)}`)
    behaviors.fullscreenButton = raw.fullscreenButton
  }
  return behaviors
}

function mergeDeploy(raw) {
  known(raw, ['remote', 'repo', 'branch', 'cname'], 'deploy.')
  if (!REMOTES.includes(raw.remote)) fail(`"deploy.remote" must be one of: ${REMOTES.join(', ')}, got ${JSON.stringify(raw.remote)}`)
  if (!('repo' in raw)) fail('"deploy.repo" is required (the git remote the pages branch is pushed to)')
  return {
    remote: raw.remote,
    repo: str(raw.repo, 'deploy.repo'),
    branch: 'branch' in raw ? str(raw.branch, 'deploy.branch') : null, // null → the adapter's convention
    cname: 'cname' in raw && raw.cname !== null ? str(raw.cname, 'deploy.cname') : null,
  }
}

export function mergeConfig(raw) {
  if (raw === null || raw === undefined) return structuredClone(DEFAULTS)
  if (typeof raw !== 'object' || Array.isArray(raw)) fail('the top level must be a mapping')
  known(raw, Object.keys(DEFAULTS), '')
  return {
    theme: mergeTheme('theme' in raw ? raw.theme : {}),
    behaviors: mergeBehaviors('behaviors' in raw ? raw.behaviors : {}),
    deploy: raw.deploy ? mergeDeploy(raw.deploy) : null, // null deploy is documented YAML idiom for "no deploy section"
  }
}

export function loadConfig(dir) {
  const file = join(dir, 'deck.yaml')
  if (!existsSync(file)) return structuredClone(DEFAULTS)
  let raw
  try {
    raw = parse(readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`deck.yaml: not valid YAML — ${e.message}`)
  }
  return mergeConfig(raw)
}

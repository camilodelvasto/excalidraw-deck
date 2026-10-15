// Forge quirks only: Codeberg Pages serves the `pages` branch; custom domains via .domains.
export default {
  name: 'codeberg-pages',
  defaultBranch: 'pages',
  files: (deploy) => (deploy.cname ? [{ path: '.domains', content: `${deploy.cname}\n` }] : []),
}

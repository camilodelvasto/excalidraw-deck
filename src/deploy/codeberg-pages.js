export default {
  name: 'codeberg-pages',
  defaultBranch: 'pages',
  host: 'codeberg.org',
  url: (owner, name) => (name === 'pages' ? `https://${owner}.codeberg.page/` : `https://${owner}.codeberg.page/${name}/`),
  files: (deploy) => (deploy.cname ? [{ path: '.domains', content: `${deploy.cname}\n` }] : []),
}

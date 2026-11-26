export default {
  name: 'codeberg-pages',
  defaultBranch: 'pages',
  files: (deploy) => (deploy.cname ? [{ path: '.domains', content: `${deploy.cname}\n` }] : []),
}

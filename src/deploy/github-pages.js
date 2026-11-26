export default {
  name: 'github-pages',
  defaultBranch: 'gh-pages',
  files: (deploy) => [
    { path: '.nojekyll', content: '' },
    ...(deploy.cname ? [{ path: 'CNAME', content: `${deploy.cname}\n` }] : []),
  ],
}

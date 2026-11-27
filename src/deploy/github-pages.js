export default {
  name: 'github-pages',
  defaultBranch: 'gh-pages',
  host: 'github.com',
  url: (owner, name) => (name === `${owner}.github.io` ? `https://${name}/` : `https://${owner}.github.io/${name}/`),
  files: (deploy) => [
    { path: '.nojekyll', content: '' },
    ...(deploy.cname ? [{ path: 'CNAME', content: `${deploy.cname}\n` }] : []),
  ],
}

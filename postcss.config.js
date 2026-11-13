// Scope the two hand-written stylesheets so they can live in one app without overriding each other:
//   src/style.css + src/theme.css  -> .landing  (cover page and login page)
//   src/campus/campus.css          -> .campus   (the listing / exchange system)
// :root, html and body rules are re-targeted at the wrapper element itself.
const SCOPES = [
  { test: /[\\/]src[\\/](style|theme)\.css$/, prefix: '.landing' },
  { test: /[\\/]src[\\/]campus[\\/]campus\.css$/, prefix: '.campus' },
]

const scopePlugin = {
  postcssPlugin: 'scope-page-styles',
  Once(root) {
    const file = root.source?.input?.file ?? ''
    const scope = SCOPES.find((s) => s.test.test(file))
    if (!scope) return
    const { prefix } = scope
    root.walkRules((rule) => {
      // Skip keyframe steps (from / to / 50%)
      if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
      rule.selectors = rule.selectors.map((sel) => {
        const s = sel.trim()
        if (s === ':root' || s === 'html' || s === 'body') return prefix
        if (s === '*') return `${prefix} *`
        if (s.startsWith(':root ')) return `${prefix} ${s.slice(6)}`
        if (s.startsWith('body ')) return `${prefix} ${s.slice(5)}`
        return `${prefix} ${s}`
      })
    })
  },
}

export default { plugins: [scopePlugin] }

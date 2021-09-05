const router = require('koa-router')()

router.get('/', async (ctx, next) => {
  ctx.set('Cross-Origin-Opener-Policy', 'same-origin')
  ctx.set('Cross-Origin-Embedder-Policy', 'require-corp')
  await ctx.render('index')
})

router.get('/video', async (ctx, next) => {
  ctx.set('Cross-Origin-Opener-Policy', 'same-origin')
  ctx.set('Cross-Origin-Embedder-Policy', 'require-corp')
  await ctx.render('videotest')
})


router.get('/string', async (ctx, next) => {
  ctx.body = 'koa2 string'
})

router.get('/json', async (ctx, next) => {
  ctx.body = {
    title: 'koa2 json'
  }
})

module.exports = router

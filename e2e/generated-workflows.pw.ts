import { expect, test } from '@playwright/test'

test('approval retains the overview and every named workflow', async ({ page }) => {
  const feed = { source: 'gateway', target: 'feed' }
  const upload = { source: 'gateway', target: 'upload' }
  const graph = {
    title: 'Media platform',
    assumptions: 'Each upload creates one thumbnail job.',
    nodes: [
      { id: 'gateway', name: 'API gateway', kind: 'Gateway' },
      { id: 'feed', name: 'Feed service', kind: 'Service' },
      { id: 'upload', name: 'Upload service', kind: 'Service' },
    ],
    edges: [feed, upload],
    workflows: [
      { name: 'Open feed', edges: [feed] },
      { name: 'Upload media', edges: [upload] },
    ],
  }
  await page.addInitScript(() => {
    Object.assign(window, {
      grecaptcha: {
        enterprise: {
          ready: (callback: () => void) => callback(),
          render: () => 0,
          execute: async () => 'test-recaptcha-token',
        },
      },
    })
  })
  await page.route(url => url.pathname.endsWith(':exchangeRecaptchaEnterpriseToken'), route => route.fulfill({
    json: { token: 'test-app-check-token', ttl: '3600s' },
  }))
  await page.route(url => url.pathname.endsWith(':generateContent'), route => route.fulfill({
    json: { candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(graph) }] }, finishReason: 'STOP' }] },
  }))

  await page.goto('/')
  await page.getByRole('textbox', { name: 'Architecture prompt' }).fill('Design a media platform')
  await page.getByRole('button', { name: 'Generate ↗' }).click()
  const views = page.getByRole('combobox', { name: 'Canvas view' })
  await views.selectOption({ label: 'Upload media' })
  await page.getByRole('button', { name: 'Replace canvas' }).click()
  const canvas = page.getByRole('region', { name: 'Architecture editor' })
  const node = (id: string) => canvas.locator(`.react-flow__node[data-id="${id}"]`)

  await expect(views).toHaveValue('1')
  await expect(node('upload')).toBeVisible()
  await expect(node('feed')).toHaveCount(0)
  await views.selectOption({ label: 'Overview' })
  await expect(node('upload')).toBeVisible()
  await expect(node('feed')).toBeVisible()
  await views.selectOption({ label: 'Open feed' })
  await expect(node('feed')).toBeVisible()
  await expect(node('upload')).toHaveCount(0)
  await page.getByText('Architecture assumptions', { exact: true }).click()
  await expect(page.getByText(graph.assumptions)).toBeVisible()
  await views.selectOption({ label: 'Upload media' })
  await expect(node('upload')).toBeVisible()
  await expect(page.getByRole('heading', { name: graph.title })).toBeVisible()
})

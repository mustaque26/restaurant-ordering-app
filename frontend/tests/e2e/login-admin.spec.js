const { test, expect } = require('@playwright/test')
const api = 'http://localhost:8080'

// This test assumes a test tenant exists with admin email TEST_TENANT_EMAIL env var
// and that the backend exposes /api/debug/otp when ALLOW_DEBUG_OTPS=true.

test.describe('Login -> Admin flow', () => {
  test('tenant can login and reach admin settings', async ({ page, request }) => {
    await page.goto('http://localhost:5173/login')
    const email = process.env.TEST_TENANT_EMAIL || 'dup@example.com'
    await page.fill('input[placeholder="Tenant admin email"]', email)
    await page.click('button:has-text("Send OTP")')

    // Try to fetch OTP from debug endpoint (requires ALLOW_DEBUG_OTPS=true on server)
    let otp = null
    try {
      const res = await request.get(`${api}/debug/otp?email=${encodeURIComponent(email)}`)
      if (res.ok()) {
        const body = await res.json()
        otp = body.otp
      }
    } catch (e) {
      // ignore
    }

    if (otp) {
      // fill and verify
      await page.fill('input[placeholder="Enter 6-digit OTP"]', otp)
      await page.click('button:has-text("Verify OTP")')
      await page.waitForTimeout(800)
    } else {
      // fallback: wait briefly for manual OTP or serverless path
      await page.waitForTimeout(2000)
      const otpInput = await page.$('input[placeholder="Enter 6-digit OTP"]')
      if (otpInput) {
        await otpInput.fill('000000')
        await page.click('button:has-text("Verify OTP")')
        await page.waitForTimeout(800)
      }
    }

    // ensure token exists
    const token = await page.evaluate(() => localStorage.getItem('tenant_token'))
    expect(token).toBeTruthy()

    // navigate to admin home and check for welcome text
    await page.goto('http://localhost:5173/')
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })
})

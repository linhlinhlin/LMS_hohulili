from pathlib import Path
import json
from playwright.sync_api import sync_playwright


BASE = "https://holilihu.online"
OUT = Path(r"E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\pwa-repair-smoke.json")


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        console_logs: list[dict] = []
        page_errors: list[str] = []
        failed_requests: list[dict] = []

        page.on("console", lambda msg: console_logs.append({"type": msg.type, "text": msg.text}))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on(
            "requestfailed",
            lambda req: failed_requests.append(
                {"url": req.url, "method": req.method, "failure": req.failure}
            ),
        )

        page.goto(f"{BASE}/reset-sw?returnUrl=%2Fstudent%2Fstorage", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")

        body_before = page.locator("body").inner_text()[:3000]
        page.get_by_role("button", name="Bắt đầu khôi phục").click()
        page.wait_for_timeout(3000)
        body_after = page.locator("body").inner_text()[:4000]

        payload = {
            "url": page.url,
            "console": console_logs,
            "page_errors": page_errors,
            "failed_requests": failed_requests,
            "body_before": body_before,
            "body_after": body_after,
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        page.screenshot(path=str(OUT.with_suffix(".png")), full_page=True)
        browser.close()

    print(OUT)


if __name__ == "__main__":
    main()

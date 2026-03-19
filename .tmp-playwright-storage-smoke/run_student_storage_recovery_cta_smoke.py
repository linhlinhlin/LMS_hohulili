from pathlib import Path
import json
import requests
from playwright.sync_api import sync_playwright


BASE = "https://holilihu.online"
OUT = Path(r"E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\student-storage-recovery-cta.json")


def login(email: str, password: str) -> dict:
    response = requests.post(
        f"{BASE}/api/v3/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["data"]


def main() -> None:
    auth = login("student@maritime.edu", "student123")

    with sync_playwright() as playwright:
      browser = playwright.chromium.launch(headless=True)
      page = browser.new_page()
      console_logs: list[dict] = []
      page_errors: list[str] = []

      page.on("console", lambda msg: console_logs.append({"type": msg.type, "text": msg.text}))
      page.on("pageerror", lambda err: page_errors.append(str(err)))

      page.add_init_script(
          f"""
          (() => {{
            const auth = {json.dumps(auth, ensure_ascii=False)};
            localStorage.setItem("lms_access_token", auth.accessToken);
            localStorage.setItem("lms_refresh_token", auth.refreshToken);
            localStorage.setItem("lms_user", JSON.stringify(auth.user));
          }})();
          """
      )

      page.goto(f"{BASE}/student/storage", wait_until="domcontentloaded")
      page.wait_for_timeout(4000)
      body_text = page.locator("body").inner_text()[:5000]

      payload = {
          "url": page.url,
          "has_advanced_repair_cta": "Khôi phục PWA nâng cao" in body_text,
          "body_excerpt": body_text,
          "console": console_logs,
          "page_errors": page_errors,
      }
      OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
      page.screenshot(path=str(OUT.with_suffix(".png")), full_page=True)
      browser.close()

    print(OUT)


if __name__ == "__main__":
    main()

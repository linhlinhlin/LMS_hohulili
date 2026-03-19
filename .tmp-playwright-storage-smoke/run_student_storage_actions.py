from pathlib import Path
import json
import requests
from playwright.sync_api import sync_playwright


BASE = "https://holilihu.online"
OUT = Path(r"E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\student-storage-actions.json")


def login(email: str, password: str) -> dict:
    response = requests.post(
        f"{BASE}/api/v3/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()["data"]
    data["user"]["role"] = (data["user"].get("role") or "").lower()
    return data


def main() -> None:
    auth = login("student@maritime.edu", "student123")
    console_logs: list[dict] = []
    page_errors: list[str] = []
    failed_requests: list[dict] = []
    api_responses: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: console_logs.append({"type": msg.type, "text": msg.text}))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on(
            "requestfailed",
            lambda req: failed_requests.append(
                {"url": req.url, "method": req.method, "failure": req.failure}
            ),
        )
        page.on(
            "response",
            lambda res: api_responses.append({"url": res.url, "status": res.status})
            if "/api/v3/" in res.url
            else None,
        )

        page.add_init_script(
            f"""
            (() => {{
              const auth = {json.dumps(auth, ensure_ascii=False)};
              localStorage.setItem('lms_access_token', auth.accessToken);
              localStorage.setItem('lms_refresh_token', auth.refreshToken);
              localStorage.setItem('lms_user', JSON.stringify(auth.user));
            }})();
            """
        )

        page.goto(f"{BASE}/student/storage", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Đồng bộ ngay").click()
        page.wait_for_timeout(1500)
        page.get_by_role("button", name="Yêu cầu giữ dữ liệu lâu dài").click()
        page.wait_for_timeout(1500)

        payload = {
            "url": page.url,
            "console": console_logs,
            "page_errors": page_errors,
            "failed_requests": failed_requests,
            "api_responses": api_responses[-40:],
            "body_text_excerpt": page.locator("body").inner_text()[:2000],
        }
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        page.screenshot(
            path=str(OUT.with_suffix(".png")),
            full_page=True,
        )
        browser.close()

    print(OUT)


if __name__ == "__main__":
    main()

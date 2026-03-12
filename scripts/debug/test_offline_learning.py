from pathlib import Path
import re
import json
from urllib import request
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


BASE_URL = "http://127.0.0.1:4200"
API_URL = "http://127.0.0.1:8088/api/v3"
OUTPUT_DIR = Path(r"E:\Sach\Sua\LMS_hohulili\coord\visuals\offline-learning")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def authenticate_student():
    payload = json.dumps({
        "email": "student@maritime.edu",
        "password": "student123",
    }).encode("utf-8")
    req = request.Request(
        f"{API_URL}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=30) as response:
        body = json.loads(response.read().decode("utf-8"))
    data = body["data"]
    user = {**data["user"], "role": (data["user"].get("role") or "").lower()}
    return data["accessToken"], data["refreshToken"], user


def bootstrap_session(page, access_token, refresh_token, user):
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.evaluate(
        """([accessToken, refreshToken, user]) => {
            localStorage.setItem('lms_access_token', accessToken);
            localStorage.setItem('lms_refresh_token', refreshToken);
            localStorage.setItem('lms_user', JSON.stringify(user));
        }""",
        [access_token, refresh_token, user],
    )


def wait_for_course_list(page):
    page.goto(f"{BASE_URL}/student/courses", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUTPUT_DIR / "student-courses-online.png"), full_page=True)


def choose_course_card(page):
    download_button = page.get_by_role("button", name=re.compile("Tải xuống|Tai xuong", re.IGNORECASE)).first
    download_button.wait_for(state="visible", timeout=15000)
    return download_button


def download_without_video(page, download_button):
    download_button.click()
    dialog = page.locator("div[role='dialog'], div.fixed.inset-0").filter(
        has_text=re.compile("Tải về|Tai ve", re.IGNORECASE)
    ).first
    dialog.wait_for(state="visible", timeout=15000)
    no_video_option = dialog.get_by_label(re.compile("Không tải video|Khong tai video", re.IGNORECASE))
    if no_video_option.count() > 0:
        no_video_option.check()
    dialog.get_by_role("button", name=re.compile("Tải về|Tai ve", re.IGNORECASE)).click()

    downloaded_badge = page.get_by_text(re.compile("Đã tải xuống|Da tai xuong", re.IGNORECASE)).first
    downloaded_badge.wait_for(state="visible", timeout=120000)
    page.screenshot(path=str(OUTPUT_DIR / "course-downloaded.png"), full_page=True)


def resolve_first_course_id(page):
    hrefs = page.eval_on_selector_all(
        "a[href^='/student/courses/']",
        """elements => elements
            .map(element => element.getAttribute('href') || '')
            .filter(Boolean)
        """,
    )
    for href in hrefs:
        match = re.search(r"/student/courses/([0-9a-f-]{36})", href)
        if match:
            return match.group(1)
    raise RuntimeError("Could not resolve a course id from /student/courses")


def continue_offline(page, course_id):
    page.route("**/api/**", lambda route: route.abort())
    page.screenshot(path=str(OUTPUT_DIR / "student-courses-offline.png"), full_page=True)

    continue_button = page.get_by_role(
        "button",
        name=re.compile("Tiếp tục học|Bắt đầu ngay|Xem lại|Tiep tuc hoc|Bat dau ngay|Xem lai", re.IGNORECASE),
    ).first
    continue_button.click()
    page.wait_for_timeout(3500)
    page.screenshot(path=str(OUTPUT_DIR / "course-learning-offline-via-cta.png"), full_page=True)

    cta_url = page.url

    page.goto(f"{BASE_URL}/student/learn/course/{course_id}", wait_until="domcontentloaded")
    page.wait_for_timeout(3500)
    page.screenshot(path=str(OUTPUT_DIR / "course-learning-offline-direct-route.png"), full_page=True)

    return cta_url


def main():
    access_token, refresh_token, user = authenticate_student()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()
        bootstrap_session(page, access_token, refresh_token, user)

        try:
            wait_for_course_list(page)
            download_button = choose_course_card(page)
            download_without_video(page, download_button)
            course_id = resolve_first_course_id(page)
            cta_url = continue_offline(page, course_id)

            url = page.url
            body_text = page.locator("body").inner_text(timeout=10000)

            print(f"COURSE_ID={course_id}")
            print(f"CTA_URL={cta_url}")
            print(f"FINAL_URL={url}")
            print(f"HAS_LESSON_ROUTE={'/lesson/' in url}")
            print(f"HAS_ERROR={'Lỗi tải khóa học' in body_text or 'Không thể tải khóa học' in body_text}")
            print(f"HAS_START_LEARNING={'Bắt đầu học' in body_text}")
            print("BODY_SNIPPET_START")
            print(body_text[:2500].encode('unicode_escape').decode('ascii'))
            print("BODY_SNIPPET_END")
        except PlaywrightTimeoutError as error:
            page.screenshot(path=str(OUTPUT_DIR / "offline-test-timeout.png"), full_page=True)
            raise error
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()

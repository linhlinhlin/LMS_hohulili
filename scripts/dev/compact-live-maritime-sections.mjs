#!/usr/bin/env node

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, "true");
  } else {
    args.set(key, next);
    i += 1;
  }
}

const baseUrl = (args.get("--base-url") || "https://holilihu.online").replace(/\/+$/, "");
const requiredArgs = ["--teacher-email", "--teacher-password", "--admin-email", "--admin-password"];
for (const name of requiredArgs) {
  if (!args.get(name)) throw new Error(`Missing required argument: ${name}`);
}

const refs = {
  stcw: ["IMO - STCW Convention", "https://www.imo.org/en/OurWork/HumanElement/Pages/STCW-Convention.aspx"],
  ism: ["IMO - ISM Code", "https://www.imo.org/en/OurWork/HumanElement/Pages/ISMCode.aspx"],
  colreg: ["IMO - COLREG Convention", "https://www.imo.org/en/About/Conventions/Pages/COLREG.aspx"],
  fal: ["IMO - Facilitation and FAL Convention", "https://www.imo.org/en/OurWork/Facilitation/Pages/Default.aspx"],
  iala: ["IALA - Maritime Buoyage System R1001", "https://www.iala.int/product/r1001/"],
  vgm: ["IMO - SOLAS VGM guidance", "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/MSC.1%20Circ.1475.pdf"],
};

const courses = [
  {
    id: "b9a4ec3a-de91-4c23-a125-4be4f62e91fc",
    categoryCode: "SAFETY",
    title: "Quản lý An toàn Hàng hải và Ứng phó Sự cố",
    standard: "STCW, SOLAS, MARPOL và ISM Code",
    audience: "thuyền viên, sĩ quan an toàn, máy trưởng, thuyền trưởng và đội ứng cứu trên tàu",
    goal: "ra quyết định an toàn có bằng chứng, kiểm soát công việc nguy hiểm, ứng phó sự cố và cải tiến sau near-miss",
    dimensions: ["con người", "thiết bị", "môi trường", "quy trình SMS", "năng lực ứng cứu", "bằng chứng hiện trường"],
    data: ["muster list", "risk assessment", "permit to work", "nhật ký ca", "near-miss report", "CAPA"],
    controls: ["stop-work authority", "barrier control", "communication loop", "muster drill", "incident command", "root-cause analysis"],
    refs: [refs.stcw, refs.ism],
    videos: [
      ["kMqaQ26zG0g", "International Safety Management Code"],
      ["g55WkNZFWZc", "International Safety Management Requirements"],
      ["p1QvrA_lL50", "International Safety Management Code overview"],
      ["-6qKSMueYl0", "International Safety Management practice"],
      ["4_Iet1UiOYs", "Living the International Safety Management Code"],
    ],
  },
  {
    id: "028f3020-e811-41dd-8164-efc15097fc69",
    categoryCode: "NAVIGATION",
    title: "Dẫn đường và Trực ca Buồng lái theo STCW",
    standard: "STCW, COLREG, SOLAS chương V và IALA Maritime Buoyage System",
    audience: "OOW, thuyền trưởng, lookout, hoa tiêu, đội buồng lái và trạm VTS khi có liên quan",
    goal: "duy trì ca trực an toàn, kiểm chứng chéo ECDIS/Radar/AIS, nhận diện nguy cơ va chạm và bàn giao ca rõ ràng",
    dimensions: ["quan sát mắt", "radar/ARPA", "AIS", "ECDIS/hải đồ", "độ sâu", "vùng nước hạn chế"],
    data: ["passage plan", "position fix", "CPA/TCPA", "under-keel clearance", "VHF log", "handover checklist"],
    controls: ["closed-loop communication", "parallel indexing", "position cross-check", "lookout discipline", "master call criteria", "bridge resource management"],
    refs: [refs.stcw, refs.colreg, refs.iala],
    videos: [
      ["D6j_a8cSUAI", "Navigational equipment on the ship bridge"],
      ["-e6kjVbW7q4", "Bridge watchkeeping"],
      ["QSCxgFsYABs", "Duties of the Officer of the Watch"],
      ["PlTDR9UvoQI", "ECDIS safety depth practice"],
      ["fsWoDtcphS0", "IALA buoyage overview"],
    ],
  },
  {
    id: "fba0e89a-0a36-44f7-8658-4ad77d4150c3",
    categoryCode: "LOGISTICS",
    title: "Logistics Hàng hải và Khai thác Cảng Cơ bản",
    standard: "SOLAS VGM, FAL Convention, nhận diện IMDG và quy trình khai thác cảng/container",
    audience: "forwarder, hãng tàu, đại lý, cảng, shipper, consignee, surveyor và bộ phận chứng từ",
    goal: "quản lý luồng hàng, luồng chứng từ, dữ liệu VGM, cut-off, container và ngoại lệ khai thác",
    dimensions: ["booking", "shipping instruction", "VGM", "container status", "cut-off", "terminal operation"],
    data: ["booking note", "bill of lading draft", "VGM declaration", "dangerous goods declaration", "EIR", "terminal report"],
    controls: ["document cut-off", "data owner check", "exception log", "cargo readiness", "port KPI review", "handover protocol"],
    refs: [refs.vgm, refs.fal],
    videos: [
      ["2Hu446v6HV4", "Verified Gross Mass for export containers"],
      ["Fto3XiqNrMs", "SOLAS VGM implementation"],
      ["-rzBFmaRuAY", "SOLAS VGM standard form"],
      ["GszA_hr2kwE", "Submitting VGM"],
      ["aBKLQRKMG3E", "Determining VGM method"],
    ],
  },
];

function pick(list, index) {
  return list[index % list.length];
}

function videoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function thumbnail(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function clean(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function refsHtml(course) {
  return course.refs
    .map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`)
    .join("");
}

async function api(method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json; charset=utf-8" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  return parsed;
}

async function login(email, password) {
  const response = await api("POST", "/api/v3/auth/login", null, { email, password });
  if (!response?.data?.accessToken) throw new Error(`Cannot login ${email}`);
  return response.data.accessToken;
}

async function sendSection(method, lessonId, sectionId, token, payload) {
  const form = new FormData();
  form.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json; charset=utf-8" }),
    "section.json",
  );
  const path = sectionId
    ? `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`
    : `/api/v3/courses/lessons/${lessonId}/sections`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function deleteSection(lessonId, sectionId, token) {
  const response = await fetch(`${baseUrl}/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`DELETE section failed (${response.status}): ${text}`);
}

function previousAndNext(chapters, chapterIndex, lessonIndex) {
  const flat = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ lesson, chapter })));
  const currentId = chapters[chapterIndex].lessons[lessonIndex].id;
  const index = flat.findIndex((item) => item.lesson.id === currentId);
  return {
    previous: index > 0 ? clean(flat[index - 1].lesson.title) : null,
    next: index < flat.length - 1 ? clean(flat[index + 1].lesson.title) : null,
  };
}

function buildLongTextSections(course, chapters, chapter, lesson, chapterIndex, lessonIndex) {
  const sequence = chapterIndex * 3 + lessonIndex;
  const focus = clean(lesson.title);
  const chapterTitle = clean(chapter.title);
  const [videoId] = pick(course.videos, sequence);
  const d1 = pick(course.dimensions, sequence);
  const d2 = pick(course.dimensions, sequence + 2);
  const d3 = pick(course.dimensions, sequence + 4);
  const x1 = pick(course.data, sequence);
  const x2 = pick(course.data, sequence + 1);
  const x3 = pick(course.data, sequence + 2);
  const x4 = pick(course.data, sequence + 3);
  const c1 = pick(course.controls, sequence);
  const c2 = pick(course.controls, sequence + 1);
  const c3 = pick(course.controls, sequence + 2);
  const { previous, next } = previousAndNext(chapters, chapterIndex, lessonIndex);
  const continuity = previous
    ? `Bài trước là <strong>${previous}</strong>; vì vậy bài này kế thừa thuật ngữ, dữ liệu đầu vào và giả định đã học trước đó.`
    : "Đây là bài mở đầu của mạch học; học viên cần thống nhất thuật ngữ, chuẩn tham chiếu và cách ghi nhận bằng chứng trước khi đi vào tình huống.";
  const handoff = next
    ? `Kết quả của bài này sẽ được dùng trong bài tiếp theo: <strong>${next}</strong>.`
    : "Đây là điểm kết thúc của mạch học, vì vậy học viên cần tổng hợp được checklist, hồ sơ và tiêu chí tự đánh giá.";

  return [
    {
      type: "TEXT",
      title: "Học liệu chuyên sâu: chuẩn, dữ liệu và nền tảng kỹ thuật",
      orderIndex: 0,
      duration: 0,
      isRequired: true,
      completionThreshold: 100,
      content: `<figure><img src="${thumbnail(videoId)}" alt="Minh họa ${course.title}" /><figcaption>Ảnh minh họa cho bối cảnh nghiệp vụ của bài. Video được đặt ở section riêng để giữ trải nghiệm học rõ ràng.</figcaption></figure>
<p><strong>${focus}</strong> thuộc chương <strong>${chapterTitle}</strong> của khóa <strong>${course.title}</strong>. ${continuity} Người học mục tiêu là ${course.audience}, tức nhóm đã cần suy nghĩ theo năng lực nghề nghiệp chứ không chỉ nhớ định nghĩa. Mục tiêu của bài là giúp học viên ${course.goal} trong điều kiện thực tế có áp lực thời gian, dữ liệu không hoàn hảo và nhiều bên liên quan.</p>
<p>Chuẩn tham chiếu của bài là <strong>${course.standard}</strong>. Khi vận dụng, học viên cần tách bạch ba lớp: yêu cầu pháp lý quốc tế, quy trình đã được công ty/tàu/cảng phê duyệt và điều kiện tại hiện trường. Một quyết định chuyên nghiệp không dừng ở câu "làm theo quy trình"; quyết định đó phải chỉ ra quy trình nào, phiên bản nào, ai có quyền áp dụng, dữ liệu nào đã kiểm chứng và bằng chứng nào được lưu để truy vết.</p>
<p>Trục kiến thức chính của bài là <strong>${d1}</strong>, nhưng không thể học riêng lẻ khỏi <strong>${d2}</strong> và <strong>${d3}</strong>. Trong vận hành hàng hải, rủi ro thường hình thành qua tương tác giữa con người, thiết bị, môi trường, dữ liệu và tổ chức. Ví dụ, một số liệu đúng về mặt kỹ thuật vẫn có thể gây quyết định sai nếu được truyền đạt muộn; một checklist đầy đủ vẫn chưa đủ nếu người ký không có thẩm quyền; một cảnh báo trên thiết bị chưa phải bằng chứng hoàn chỉnh nếu không được đối chiếu với nguồn độc lập.</p>
<h4>1. Khung năng lực cần đạt</h4>
<p>Học viên phải chứng minh được bốn năng lực. Thứ nhất là <strong>nhận thức tình huống</strong>: mô tả chính xác điều đang xảy ra, phân biệt dữ kiện quan sát được với suy đoán, và chỉ ra giới hạn an toàn nào đang bị ảnh hưởng. Thứ hai là <strong>kiểm chứng dữ liệu</strong>: biết nguồn nào là nguồn phát sinh, nguồn nào là nguồn kiểm tra chéo, nguồn nào chỉ dùng cho tham khảo. Thứ ba là <strong>ra quyết định theo rủi ro</strong>: chọn hành động theo hậu quả, khả năng xảy ra, thời gian còn lại và quyền hạn. Thứ tư là <strong>lưu hồ sơ</strong>: biến hành động thành bằng chứng có thể kiểm tra sau ca trực hoặc sau sự cố.</p>
<table>
  <thead><tr><th>Năng lực</th><th>Dữ liệu cần dùng</th><th>Dấu hiệu đạt</th><th>Sai sót cần tránh</th></tr></thead>
  <tbody>
    <tr><td>Nhận thức tình huống</td><td>${x1}, quan sát hiện trường, thông tin từ người phụ trách</td><td>Mô tả được ai, cái gì, ở đâu, khi nào và vì sao cần chú ý.</td><td>Dùng cảm giác nguy hiểm thay cho dữ kiện cụ thể.</td></tr>
    <tr><td>Kiểm chứng dữ liệu</td><td>${x2}, nguồn độc lập, phiên bản tài liệu</td><td>Nêu được ít nhất hai nguồn kiểm tra chéo và sai khác nếu có.</td><td>Chỉ tin một màn hình, một biểu mẫu hoặc một lời báo miệng.</td></tr>
    <tr><td>Ra quyết định</td><td>${x3}, tiêu chí dừng, quyền phê duyệt</td><td>Chọn được hành động làm giảm rủi ro rõ nhất trong thời gian có sẵn.</td><td>Tiếp tục hoạt động chỉ vì áp lực lịch hoặc thói quen.</td></tr>
    <tr><td>Lưu hồ sơ</td><td>${x4}, log, checklist, biên bản, ảnh, CAPA nếu có</td><td>Người không có mặt tại hiện trường vẫn truy vết được quyết định.</td><td>Ghi kết quả cuối cùng nhưng bỏ mất giả định và cảnh báo còn mở.</td></tr>
  </tbody>
</table>
<h4>2. Phân tích kỹ thuật dữ liệu</h4>
<p><strong>${x1}</strong> là dữ liệu đầu vào then chốt trong bài này. Học viên cần hỏi: dữ liệu được tạo ra lúc nào, bởi ai, bằng phương tiện nào, có được tự động hóa hay nhập tay, và có thể bị trễ, sai lệch hoặc diễn giải sai ở đâu. <strong>${x2}</strong> là lớp kiểm chứng chéo, dùng để giảm rủi ro phụ thuộc vào một nguồn. <strong>${x3}</strong> và <strong>${x4}</strong> là dữ liệu dùng cho quyết định, bàn giao hoặc hậu kiểm. Việc nhầm vai trò của các dữ liệu này là nguyên nhân phổ biến khiến báo cáo trông đầy đủ nhưng không giúp cải thiện an toàn.</p>
<p>Ở cấp chuyên nghiệp, mỗi dữ liệu phải đi kèm bối cảnh. Một số đo không có thời điểm đo thì khó dùng để đánh giá xu hướng. Một biểu mẫu không có người xác nhận thì khó dùng để chứng minh trách nhiệm. Một thông tin truyền miệng không được lặp lại hoặc ghi log thì khó dùng khi điều tra sự cố. Vì vậy, học viên cần dùng nguyên tắc "dữ liệu + nguồn + thời điểm + người xác nhận + giới hạn sử dụng".</p>
<h4>3. Cơ chế rủi ro và lớp phòng vệ</h4>
<p>Bài học áp dụng tư duy quản lý lớp phòng vệ. Một sự cố hiếm khi xuất hiện từ một lỗi duy nhất; thường là nhiều lớp bảo vệ cùng suy yếu: dữ liệu đến muộn, người nhận hiểu sai, thiết bị báo động nhưng không được xác nhận, checklist làm hình thức, hoặc quyền dừng công việc không được dùng đúng lúc. Khi phân tích <strong>${focus}</strong>, học viên phải chỉ ra lớp phòng vệ nào đang hoạt động, lớp nào đã yếu và lớp nào cần khôi phục trước.</p>
<table>
  <thead><tr><th>Lớp phòng vệ</th><th>Câu hỏi kiểm tra</th><th>Bằng chứng tối thiểu</th></tr></thead>
  <tbody>
    <tr><td>Con người</td><td>Người phụ trách có đủ năng lực, nghỉ ngơi và nhận thức tình huống không?</td><td>Phân công ca, bàn giao, xác nhận nhận lệnh.</td></tr>
    <tr><td>Thiết bị/dữ liệu</td><td>Nguồn dữ liệu có được kiểm chứng độc lập và còn trong giới hạn tin cậy không?</td><td>Ảnh màn hình, log thiết bị, số liệu đối chiếu.</td></tr>
    <tr><td>Quy trình</td><td>Quy trình áp dụng đúng phạm vi, đúng phiên bản và đúng thẩm quyền không?</td><td>Checklist, permit, SMS, hướng dẫn cảng hoặc lệnh điều động.</td></tr>
    <tr><td>Truyền đạt</td><td>Thông tin quan trọng đã được lặp lại, xác nhận và ghi nhận chưa?</td><td>VHF log, email, biên bản, handover note.</td></tr>
  </tbody>
</table>
<h4>4. Nguồn chính thức cần đối chiếu</h4>
<p>Nội dung này được viết để phục vụ học tập nội bộ và tự học. Khi áp dụng vào tình huống thật, học viên phải đối chiếu với văn bản chính thức, luật quốc gia, quy trình công ty và hướng dẫn của cảng/tàu tại thời điểm làm việc.</p>
<ul>${refsHtml(course)}</ul>`,
    },
    {
      type: "TEXT",
      title: "Ứng dụng thực hành: quy trình, mô phỏng và checklist đánh giá",
      orderIndex: 1,
      duration: 0,
      isRequired: true,
      completionThreshold: 100,
      content: `<p>Section này chuyển kiến thức của bài <strong>${focus}</strong> thành thao tác thực hành. ${handoff} Học viên cần đọc theo trình tự: quy trình quyết định, ma trận rủi ro, tình huống mô phỏng, checklist đánh giá và yêu cầu hồ sơ. Nếu bỏ qua một bước, câu trả lời thường sẽ rơi vào dạng chung chung và không đủ chất lượng nghiệp vụ.</p>
<h4>1. Quy trình quyết định 6 bước</h4>
<table>
  <thead><tr><th>Bước</th><th>Việc phải làm</th><th>Câu hỏi kiểm soát</th><th>Bằng chứng</th></tr></thead>
  <tbody>
    <tr><td>1. Gọi đúng vấn đề</td><td>Mô tả tình huống bằng dữ kiện quan sát được.</td><td>Điều gì đang xảy ra, ở đâu, lúc nào, ai chịu ảnh hưởng?</td><td>Ảnh, log, vị trí, thời gian, người báo cáo.</td></tr>
    <tr><td>2. Xác định chuẩn</td><td>Nối tình huống với ${course.standard} và quy trình nội bộ.</td><td>Chuẩn nào liên quan, phạm vi áp dụng là gì, có ngoại lệ không?</td><td>Trích dẫn quy trình, checklist, hướng dẫn cảng/tàu.</td></tr>
    <tr><td>3. Kiểm chứng dữ liệu</td><td>Đối chiếu ${x1}, ${x2}, ${x3}.</td><td>Dữ liệu có độc lập không, có trễ không, có người xác nhận không?</td><td>Bảng đối chiếu, chữ ký, ghi chú sai khác.</td></tr>
    <tr><td>4. Chọn kiểm soát</td><td>Áp dụng ${c1}, ${c2} hoặc ${c3} theo mức rủi ro.</td><td>Hành động nào giảm rủi ro rõ nhất và ai có quyền phê duyệt?</td><td>Permit, thông báo, lệnh điều động, biên bản.</td></tr>
    <tr><td>5. Xác nhận hiệu lực</td><td>Đánh giá lại sau hành động.</td><td>Rủi ro đã giảm chưa, còn cảnh báo mở nào không?</td><td>Kết quả kiểm tra lại, xác nhận người nhận, cập nhật log.</td></tr>
    <tr><td>6. Bàn giao</td><td>Chuyển trạng thái còn mở cho ca/bộ phận kế tiếp.</td><td>Người nhận có lặp lại đúng hành động tiếp theo không?</td><td>Handover note, email, nhật ký ca, hệ thống cảng.</td></tr>
  </tbody>
</table>
<h4>2. Ma trận rủi ro áp dụng cho bài</h4>
<p>Ma trận dưới đây dùng cho học viên đã có nền tảng nghiệp vụ. Không nên coi đây là công thức thay thế quy trình công ty; nó là công cụ học tập để làm rõ tư duy. Mức rủi ro phải dựa trên hậu quả thực tế, khả năng xảy ra và thời gian còn lại để kiểm soát.</p>
<table>
  <thead><tr><th>Mức</th><th>Dấu hiệu</th><th>Hành động</th><th>Điều kiện tiếp tục</th></tr></thead>
  <tbody>
    <tr><td>Thấp</td><td>Dữ liệu thống nhất, ảnh hưởng cục bộ, còn đủ thời gian.</td><td>Làm theo checklist, ghi hồ sơ tối thiểu.</td><td>Không còn cảnh báo mở và người phụ trách xác nhận.</td></tr>
    <tr><td>Trung bình</td><td>Có sai khác dữ liệu hoặc cần phối hợp nhiều bên.</td><td>Tăng kiểm tra, thông báo người phụ trách, dùng ${c1}.</td><td>Dữ liệu đã đối chiếu và có người chịu trách nhiệm.</td></tr>
    <tr><td>Cao</td><td>Đe dọa an toàn người/tàu/hàng/môi trường hoặc lịch khai thác quan trọng.</td><td>Dừng/giảm hoạt động, gọi cấp có thẩm quyền, dùng ${c2}.</td><td>Có phê duyệt rõ ràng và bằng chứng giảm rủi ro.</td></tr>
    <tr><td>Không chấp nhận</td><td>Thiếu dữ liệu cốt lõi, mất lớp phòng vệ chính hoặc không ai xác nhận quyền hạn.</td><td>Không tiếp tục; cô lập rủi ro và kích hoạt ${c3}.</td><td>Chỉ tiếp tục khi điều kiện an toàn được phục hồi bằng bằng chứng.</td></tr>
  </tbody>
</table>
<h4>3. Tình huống mô phỏng</h4>
<p><strong>Bối cảnh:</strong> bạn đang trong một ca làm việc có áp lực thời gian. Dữ liệu về <strong>${d1}</strong> không thống nhất với dữ liệu về <strong>${d2}</strong>. Một bên muốn tiếp tục để giữ lịch, trong khi một bên khác yêu cầu dừng để kiểm tra. Bạn không được trả lời bằng cảm tính; bạn phải đưa ra đề xuất có bằng chứng, chỉ rõ quyền hạn và ghi lại rủi ro còn lại.</p>
<ol>
  <li>Viết mô tả tình huống trong một câu, không dùng suy đoán.</li>
  <li>Chọn ba dữ liệu phải kiểm chứng ngay: ${x1}, ${x2}, ${x3}.</li>
  <li>Xác định chuẩn hoặc quy trình liên quan đến quyết định.</li>
  <li>Chọn hành động kiểm soát chính: ${c1}, ${c2} hoặc ${c3}; giải thích lý do.</li>
  <li>Nêu người cần phê duyệt hoặc cần được thông báo.</li>
  <li>Ghi bằng chứng cần lưu để người khác kiểm tra lại quyết định.</li>
</ol>
<p><strong>Yêu cầu phản biện:</strong> sau khi chọn hành động, hãy viết một câu trả lời cho câu hỏi: "Điều gì có thể chứng minh quyết định của tôi là sai?" Nếu không trả lời được, nghĩa là bạn chưa xác định đủ giả định. Một quyết định đáng tin cậy luôn đi kèm điều kiện kiểm tra lại, tiêu chí dừng và bằng chứng bàn giao.</p>
<h4>4. Checklist đánh giá năng lực</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>Đạt khi</th><th>Hồ sơ học viên cần tạo</th></tr></thead>
  <tbody>
    <tr><td>Hiểu chuẩn</td><td>Giải thích được liên hệ giữa ${focus} và ${course.standard}.</td><td>Tóm tắt 100-150 từ bằng tiếng Việt chuẩn nghiệp vụ.</td></tr>
    <tr><td>Kiểm chứng dữ liệu</td><td>Phân biệt được nguồn phát sinh, nguồn kiểm chứng và nguồn bàn giao.</td><td>Bảng ba cột cho ${x1}, ${x2}, ${x3}.</td></tr>
    <tr><td>Ra quyết định</td><td>Chọn hành động phù hợp với mức rủi ro và quyền hạn.</td><td>Ma trận rủi ro rút gọn.</td></tr>
    <tr><td>Truyền đạt</td><td>Nêu đúng người nhận, kênh truyền đạt và cách xác nhận lại.</td><td>Mẫu thông báo hoặc handover note.</td></tr>
    <tr><td>Lưu hồ sơ</td><td>Hồ sơ đủ để truy vết quyết định sau ca trực hoặc sau sự cố.</td><td>File Word thực hành đã điền thử.</td></tr>
  </tbody>
</table>
<h4>5. Lỗi thường gặp và cách sửa</h4>
<p>Lỗi thứ nhất là trả lời bằng khẩu hiệu: "báo cáo cấp trên", "làm theo quy trình", "đảm bảo an toàn". Những câu này không sai nhưng chưa đủ. Câu trả lời đạt yêu cầu phải nêu rõ báo cáo cho ai, bằng kênh nào, trong bao lâu, dựa trên dữ liệu nào và lưu hồ sơ gì. Lỗi thứ hai là bỏ qua rủi ro còn lại sau khi đã hành động. Trong vận hành thực tế, một hành động có thể giảm rủi ro này nhưng tạo rủi ro khác; vì vậy phần bàn giao phải ghi cả điều đã xử lý và điều còn mở.</p>
<p>Lỗi thứ ba là nhầm giữa học liệu và quy định bắt buộc. Section này giúp học viên luyện tư duy và thao tác, nhưng khi làm việc thật phải đối chiếu tài liệu gốc, quy trình SMS, hướng dẫn cảng/tàu và lệnh điều hành tại thời điểm đó. Lỗi thứ tư là xem video hoặc đọc PDF như phần tham khảo rời rạc. Trong bài này, video riêng, PDF chính thức và biểu mẫu Word là ba bằng chứng học tập bổ trợ: video giúp quan sát thao tác, PDF giúp đối chiếu thuật ngữ, Word giúp biến kiến thức thành hồ sơ.</p>`,
    },
  ];
}

function videoPayload(course, sequence, existing = {}) {
  const [videoId, title] = pick(course.videos, sequence);
  return {
    type: "VIDEO",
    title: `Video riêng: ${title}`,
    content: "Video được tách thành mục riêng để học viên xem trong trình phát LMS, không chèn link vào phần đọc.",
    videoUrl: videoUrl(videoId),
    videoType: "YOUTUBE",
    orderIndex: 2,
    duration: existing.duration || 10,
    isRequired: false,
    completionThreshold: existing.completionThreshold || 80,
  };
}

function filePayload(section, orderIndex) {
  return {
    type: "FILE",
    title: section.title,
    content: section.content || "Tài liệu đính kèm phục vụ học tập, đối chiếu chuẩn và hoàn thành bài thực hành.",
    fileUrl: section.fileUrl,
    fileName: section.fileName,
    previewPdfUrl: section.previewPdfUrl,
    previewStatus: section.previewStatus,
    orderIndex,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
  };
}

function count(chapters) {
  const lessons = chapters.flatMap((chapter) => chapter.lessons || []);
  const sections = lessons.flatMap((lesson) => lesson.sections || []);
  const text = sections.filter((section) => section.type === "TEXT");
  const files = sections.filter((section) => section.type === "FILE");
  return {
    chapters: chapters.length,
    lessons: lessons.length,
    sections: sections.length,
    text: text.length,
    video: sections.filter((section) => section.type === "VIDEO").length,
    file: files.length,
    pdf: files.filter((section) => /\.pdf(?:[?#]|$)/i.test(section.fileUrl || "")).length,
    word: files.filter((section) => /\.(doc|docx)(?:[?#]|$)/i.test(section.fileUrl || "")).length,
    avgTextLength: text.length ? Math.round(text.reduce((sum, section) => sum + (section.content || "").length, 0) / text.length) : 0,
    maxSectionsPerLesson: Math.max(...lessons.map((lesson) => (lesson.sections || []).length)),
    textWithYoutube: text.filter((section) => /youtube\.com|youtu\.be/i.test(section.content || "")).length,
  };
}

console.log(`Logging in to ${baseUrl}...`);
const teacherToken = await login(args.get("--teacher-email"), args.get("--teacher-password"));
const adminToken = await login(args.get("--admin-email"), args.get("--admin-password"));
const studentToken = args.get("--student-email") && args.get("--student-password")
  ? await login(args.get("--student-email"), args.get("--student-password"))
  : null;

const categories = (await api("GET", "/api/v3/categories", teacherToken)).data || [];
const categoryByCode = new Map(categories.map((category) => [category.code, category.id]));
const summary = [];

for (const course of courses) {
  console.log(`Compacting lesson sections: ${course.title}`);
  const categoryId = categoryByCode.get(course.categoryCode);
  await api("PUT", `/api/v3/courses/${course.id}`, teacherToken, {
    title: course.title,
    description:
      `Khóa học hàng hải chuyên sâu theo ${course.standard}. Mỗi bài được cấu trúc gọn thành 5 mục: 2 học liệu chuyên sâu dung lượng lớn, 1 video riêng, 1 PDF chính thức và 1 biểu mẫu Word thực hành.`,
    thumbnailUrl: thumbnail(course.videos[0][0]),
    categoryId,
    tags: [course.categoryCode, "STCW", "IMO", "Maritime", "PDF", "Word", "Video riêng"],
    welcomeMessage:
      "Mỗi bài chỉ giữ các mục thật cần thiết. Học viên đọc hai section chuyên sâu, xem video riêng, mở PDF chính thức để đối chiếu và dùng file Word để làm bài thực hành.",
    courseInformation:
      "Cấu trúc cập nhật: 5 chương, 15 bài; mỗi bài có 5 section gồm 2 text section dài, 1 video section, 1 PDF section và 1 Word section. Nội dung text được gom lại để tăng chiều sâu thay vì chia thành quá nhiều mục ngắn.",
    benefits:
      "Học viên có thể học liền mạch hơn, đọc nội dung chuyên sâu hơn trong từng section, xem video riêng biệt và nộp/ghi chú thực hành bằng biểu mẫu Word.",
    credits: 4,
    visibility: "PUBLIC",
    priceType: "FREE",
    price: 0,
    salePrice: null,
    deliveryMode: "SELF_PACED",
    allowOfflineDownload: true,
  });

  const draft = (await api("GET", `/api/v3/teacher/courses/${course.id}/draft/content`, teacherToken)).data || [];
  let updatedText = 0;
  let deletedText = 0;
  let updatedVideo = 0;
  let updatedFiles = 0;

  for (let chapterIndex = 0; chapterIndex < draft.length; chapterIndex += 1) {
    const chapter = draft[chapterIndex];
    for (let lessonIndex = 0; lessonIndex < (chapter.lessons || []).length; lessonIndex += 1) {
      const lesson = chapter.lessons[lessonIndex];
      const sequence = chapterIndex * 3 + lessonIndex;
      const sections = [...(lesson.sections || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const textSections = sections.filter((section) => section.type === "TEXT");
      const videoSection = sections.find((section) => section.type === "VIDEO");
      const fileSections = sections.filter((section) => section.type === "FILE");
      const pdfSection = fileSections.find((section) => /\.pdf(?:[?#]|$)/i.test(section.fileUrl || "")) || fileSections[0];
      const wordSection = fileSections.find((section) => /\.(doc|docx)(?:[?#]|$)/i.test(section.fileUrl || ""));

      const newTexts = buildLongTextSections(course, draft, chapter, lesson, chapterIndex, lessonIndex);
      for (let i = 0; i < newTexts.length; i += 1) {
        if (!textSections[i]) throw new Error(`Lesson ${lesson.id} is missing text section ${i + 1}`);
        await sendSection("PUT", lesson.id, textSections[i].id, teacherToken, newTexts[i]);
        updatedText += 1;
      }

      for (const extra of textSections.slice(2)) {
        await deleteSection(lesson.id, extra.id, teacherToken);
        deletedText += 1;
      }

      if (!videoSection) throw new Error(`Lesson ${lesson.id} is missing video section`);
      await sendSection("PUT", lesson.id, videoSection.id, teacherToken, videoPayload(course, sequence, videoSection));
      updatedVideo += 1;

      if (!pdfSection || !wordSection) throw new Error(`Lesson ${lesson.id} is missing PDF or Word section`);
      await sendSection("PUT", lesson.id, pdfSection.id, teacherToken, filePayload(pdfSection, 3));
      await sendSection("PUT", lesson.id, wordSection.id, teacherToken, filePayload(wordSection, 4));
      updatedFiles += 2;
    }
  }

  await api("POST", `/api/v3/teacher/courses/${course.id}/submit-for-approval`, teacherToken, {
    releaseNotes:
      "Thu gọn mỗi bài còn 5 section: 2 section text chuyên sâu dung lượng lớn, 1 video riêng, 1 PDF chính thức và 1 Word thực hành.",
  });
  await api("PATCH", `/api/v3/admin/courses/${course.id}/approve`, adminToken, {
    comment:
      "Đã duyệt bản điều chỉnh cấu trúc: giảm số section, tăng chiều sâu từng section text, giữ video/PDF/Word riêng biệt.",
  });

  const published = (await api("GET", `/api/v3/courses/${course.id}/content`, studentToken || teacherToken)).data || [];
  summary.push({ title: course.title, updatedText, deletedText, updatedVideo, updatedFiles, published: count(published) });
}

console.log(JSON.stringify(summary, null, 2));

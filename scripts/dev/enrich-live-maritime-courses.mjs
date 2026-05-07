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
  if (!args.get(name)) {
    throw new Error(`Missing required argument: ${name}`);
  }
}

const sources = {
  stcw: {
    label: "IMO - STCW Convention",
    url: "https://www.imo.org/en/OurWork/HumanElement/Pages/STCW-Convention.aspx",
  },
  ism: {
    label: "IMO - ISM Code",
    url: "https://www.imo.org/en/OurWork/HumanElement/Pages/ISMCode.aspx",
  },
  colreg: {
    label: "IMO - COLREG Convention",
    url: "https://www.imo.org/en/About/Conventions/Pages/COLREG.aspx",
  },
  vgm: {
    label: "IMO - SOLAS VGM guidance",
    url: "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/MSC.1%20Circ.1475.pdf",
  },
  fal: {
    label: "IMO - Facilitation and FAL Convention",
    url: "https://www.imo.org/en/OurWork/Facilitation/Pages/Default.aspx",
  },
  iala: {
    label: "IALA - Maritime Buoyage System R1001",
    url: "https://www.iala.int/product/r1001/",
  },
};

const pdfSources = {
  fatigue: {
    key: "imo-fatigue",
    title: "IMO MSC.1/Circ.1598 - Guidelines on Fatigue",
    source: "IMO",
    url: "https://wwwcdn.imo.org/localresources/en/OurWork/HumanElement/Documents/MSC.1-Circ.1598.pdf",
    fileName: "IMO_MSC1_Circ1598_Guidelines_on_Fatigue.pdf",
  },
  ismSupplement: {
    key: "imo-ism-supplement",
    title: "IMO ISM Code supplement",
    source: "IMO",
    url: "https://wwwcdn.imo.org/localresources/en/publications/Documents/Supplements/English/QQD117E_062018.pdf",
    fileName: "IMO_ISM_Code_Supplement_2018.pdf",
  },
  ialaR1001: {
    key: "iala-r1001",
    title: "IALA R1001 - Maritime Buoyage System",
    source: "IALA",
    url: "https://www.iala.int/content/uploads/2022/05/C75-10.3.7-Revised-Recommendation-R1001-Ed2.0-The-IALA-Maritime-Buoyage-System-June-2022.pdf",
    fileName: "IALA_R1001_Maritime_Buoyage_System.pdf",
  },
  vgmGuidelines: {
    key: "imo-vgm",
    title: "IMO MSC.1/Circ.1475 - Verified Gross Mass",
    source: "IMO",
    url: "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/MSC.1%20Circ.1475.pdf",
    fileName: "IMO_MSC1_Circ1475_Verified_Gross_Mass.pdf",
  },
  falCircular: {
    key: "imo-fal-edi",
    title: "IMO FAL.3/Circ.220 - Electronic data exchange",
    source: "IMO",
    url: "https://wwwcdn.imo.org/localresources/en/OurWork/Facilitation/FAL%20related%20nonmandatory%20documents/FAL.3-Circ.220.pdf",
    fileName: "IMO_FAL3_Circ220_Electronic_Data_Exchange.pdf",
  },
  cscFlyer: {
    key: "imo-csc",
    title: "IMO CSC safe containers reference flyer",
    source: "IMO",
    url: "https://wwwcdn.imo.org/localresources/en/publications/Documents/Flyers/Flyers/IC282E.pdf",
    fileName: "IMO_CSC_Safe_Containers_Reference.pdf",
  },
};

const courses = [
  {
    id: "b9a4ec3a-de91-4c23-a125-4be4f62e91fc",
    categoryCode: "SAFETY",
    title: "Quản lý An toàn Hàng hải và Ứng phó Sự cố",
    thumbnailVideoId: "kMqaQ26zG0g",
    standardLine: "STCW, SOLAS, MARPOL và ISM Code",
    competency: "quản trị rủi ro, kiểm soát công việc nguy hiểm, ứng phó khẩn cấp và cải tiến sau sự cố",
    operatorFrame: "thuyền viên, sĩ quan an toàn, trực ca boong, máy trưởng, thuyền trưởng và đội ứng cứu trên tàu",
    officialRefs: [sources.stcw, sources.ism],
    pdfs: [pdfSources.fatigue, pdfSources.ismSupplement],
    videos: [
      ["kMqaQ26zG0g", "International Safety Management Code"],
      ["g55WkNZFWZc", "International Safety Management Requirements"],
      ["p1QvrA_lL50", "International Safety Management Code overview"],
      ["-6qKSMueYl0", "International Safety Management practice"],
      ["4_Iet1UiOYs", "Living the International Safety Management Code"],
    ],
    dimensions: ["con người", "thiết bị", "môi trường", "quy trình SMS", "bằng chứng hiện trường"],
    dataPoints: ["muster list", "risk assessment", "permit to work", "nhật ký ca", "near-miss report", "CAPA"],
    controls: ["stop-work authority", "barrier control", "communication loop", "muster drill", "incident command"],
    metadata: {
      description:
        "Khóa học chuyên sâu cho thuyền viên đã có nền tảng nghiệp vụ, tập trung vào năng lực quản lý an toàn theo STCW, ISM Code, SOLAS và thực hành ứng phó sự cố. Nội dung đi từ nhận diện nguy cơ, kiểm soát công việc, diễn tập, báo cáo near-miss đến CAPA có bằng chứng.",
      welcomeMessage:
        "Học viên nên học theo mạch: chuẩn năng lực, dữ liệu hiện trường, kiểm soát rủi ro, ứng phó, báo cáo và cải tiến. Mỗi bài gồm phần đọc dài, sơ đồ quyết định, video riêng và tài liệu đính kèm để dùng khi tự học hoặc thảo luận ca trực.",
      courseInformation:
        "Khóa gồm 5 chương, 15 bài, mỗi bài có nhiều mục nội dung liên kết, video riêng, PDF chuẩn tham chiếu và biểu mẫu Word thực hành. Tài liệu được viết cho bối cảnh tàu biển, cảng và công ty quản lý tàu, không thay thế quy trình SMS chính thức của từng công ty.",
      benefits:
        "Sau khóa học, học viên có thể lập ma trận rủi ro, giải thích vai trò của ISM/SOLAS/STCW trong quyết định an toàn, ghi nhận bằng chứng, chuẩn hóa bàn giao ca, xử lý near-miss và đề xuất CAPA có thể kiểm tra.",
    },
  },
  {
    id: "028f3020-e811-41dd-8164-efc15097fc69",
    categoryCode: "NAVIGATION",
    title: "Dẫn đường và Trực ca Buồng lái theo STCW",
    thumbnailVideoId: "D6j_a8cSUAI",
    standardLine: "STCW, COLREG, SOLAS chương V và IALA Maritime Buoyage System",
    competency: "duy trì ca trực an toàn, lập kế hoạch hành trình, kiểm chứng chéo ECDIS/Radar/AIS và giao tiếp nghiệp vụ",
    operatorFrame: "OOW, thuyền trưởng, lookout, hoa tiêu, đội buồng lái và các trạm VTS khi có liên quan",
    officialRefs: [sources.stcw, sources.colreg, sources.iala],
    pdfs: [pdfSources.ialaR1001, pdfSources.fatigue],
    videos: [
      ["D6j_a8cSUAI", "Navigational equipment on the ship bridge"],
      ["-e6kjVbW7q4", "Bridge watchkeeping"],
      ["QSCxgFsYABs", "Duties of the Officer of the Watch"],
      ["PlTDR9UvoQI", "ECDIS safety depth practice"],
      ["fsWoDtcphS0", "IALA buoyage overview"],
    ],
    dimensions: ["quan sát mắt", "radar/ARPA", "AIS", "ECDIS/hải đồ", "độ sâu và vùng nước hạn chế"],
    dataPoints: ["passage plan", "position fix", "CPA/TCPA", "under-keel clearance", "VHF log", "handover checklist"],
    controls: ["closed-loop communication", "parallel indexing", "position cross-check", "lookout discipline", "master call criteria"],
    metadata: {
      description:
        "Khóa học phát triển năng lực trực ca buồng lái theo STCW, COLREG, SOLAS chương V và hệ thống phao tiêu IALA. Nội dung nhấn mạnh giới hạn của từng nguồn dữ liệu, quy tắc kiểm chứng chéo, tiêu chí gọi thuyền trưởng và bàn giao ca có bằng chứng.",
      welcomeMessage:
        "Mỗi bài được viết theo góc nhìn của một ca trực thực tế. Học viên đọc phần chuẩn tham chiếu, phân tích dữ liệu điều hướng, xem video riêng rồi hoàn thành checklist hoặc biểu mẫu tình huống.",
      courseInformation:
        "Khóa gồm 5 chương, 15 bài, mỗi bài có phần đọc dài, sơ đồ quyết định, video riêng, PDF chuẩn tham chiếu và file Word thực hành. Nội dung phù hợp cho thuyền viên, OOW mới và người chuẩn bị ôn tập năng lực STCW về watchkeeping.",
      benefits:
        "Học viên có thể mô tả trách nhiệm OOW, kiểm chứng vị trí bằng nhiều nguồn, nhận diện giới hạn AIS/Radar/ECDIS, đọc phao tiêu IALA, xử lý nguy cơ va chạm và bàn giao ca có cấu trúc.",
    },
  },
  {
    id: "fba0e89a-0a36-44f7-8658-4ad77d4150c3",
    categoryCode: "LOGISTICS",
    title: "Logistics Hàng hải và Khai thác Cảng Cơ bản",
    thumbnailVideoId: "2Hu446v6HV4",
    standardLine: "SOLAS VGM, FAL Convention, nhận diện IMDG và quy trình khai thác cảng/container",
    competency: "quản lý luồng hàng, chứng từ, dữ liệu VGM, container, cut-off, giao nhận và ngoại lệ khai thác",
    operatorFrame: "forwarder, hãng tàu, đại lý, cảng, shipper, consignee, surveyor và bộ phận chứng từ",
    officialRefs: [sources.vgm, sources.fal],
    pdfs: [pdfSources.vgmGuidelines, pdfSources.falCircular, pdfSources.cscFlyer],
    videos: [
      ["2Hu446v6HV4", "Verified Gross Mass for export containers"],
      ["Fto3XiqNrMs", "SOLAS VGM implementation"],
      ["-rzBFmaRuAY", "SOLAS VGM standard form"],
      ["GszA_hr2kwE", "Submitting VGM"],
      ["aBKLQRKMG3E", "Determining VGM method"],
    ],
    dimensions: ["booking", "shipping instruction", "VGM", "container status", "cut-off", "terminal operation"],
    dataPoints: ["booking note", "bill of lading draft", "VGM declaration", "dangerous goods declaration", "EIR", "terminal report"],
    controls: ["document cut-off", "data owner check", "exception log", "cargo readiness", "port KPI review"],
    metadata: {
      description:
        "Khóa học mô phỏng một lô hàng biển từ booking đến cảng đích, giúp học viên hiểu logic vận tải, chứng từ, VGM theo SOLAS, FAL/electronic data exchange, container và xử lý ngoại lệ trong khai thác cảng.",
      welcomeMessage:
        "Học viên nên theo dõi xuyên suốt một lô hàng giả định. Mỗi bài bổ sung một lớp dữ liệu mới để thấy logistics biển là chuỗi quyết định liên kết, không phải các biểu mẫu rời rạc.",
      courseInformation:
        "Khóa gồm 5 chương, 15 bài, mỗi bài có phần đọc dài, bảng dòng chứng từ/hàng hóa, video riêng, PDF chuẩn tham chiếu và biểu mẫu Word thực hành. Nội dung phù hợp cho thuyền viên làm việc với cảng, đại lý, chứng từ và khai thác tàu.",
      benefits:
        "Học viên có thể đọc booking, shipping instruction, vận đơn nháp, VGM, dữ liệu container, chỉ số cảng và lập nhật ký ngoại lệ để phối hợp với các bên liên quan.",
    },
  },
];

function thumbnail(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function videoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
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
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }
  return parsed;
}

async function login(email, password) {
  const response = await api("POST", "/api/v3/auth/login", null, { email, password });
  if (!response?.success || !response.data?.accessToken) {
    throw new Error(`Cannot login ${email}`);
  }
  return response.data.accessToken;
}

async function sendSection(method, lessonId, sectionId, token, payload, file) {
  const form = new FormData();
  form.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json; charset=utf-8" }),
    "section.json",
  );
  if (file) {
    form.append("file", file.blob, file.fileName);
  }

  const path = sectionId
    ? `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`
    : `/api/v3/courses/lessons/${lessonId}/sections`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function fetchAttachmentFile(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 LMS maritime content updater" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Cannot fetch ${source.url}: ${response.status}`);
  }
  const type = response.headers.get("content-type") || "application/pdf";
  if (!type.toLowerCase().includes("pdf")) {
    throw new Error(`Attachment is not a PDF: ${source.url} (${type})`);
  }
  const bytes = await response.arrayBuffer();
  return {
    blob: new Blob([bytes], { type: "application/pdf" }),
    fileName: source.fileName,
  };
}

function wordFile(fileName, html) {
  return {
    fileName,
    blob: new Blob([html], { type: "application/msword;charset=utf-8" }),
  };
}

function extractSavedSection(response) {
  const raw = response?.data ?? response ?? {};
  if (raw.data && typeof raw.data === "object") {
    return { id: raw.id, type: raw.type, ...raw.data };
  }
  return raw;
}

function htmlRefs(refs) {
  return refs
    .map((ref) => `<li><a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.label}</a></li>`)
    .join("");
}

function cleanTitle(title) {
  return (title || "").replace(/\s+/g, " ").trim();
}

function asciiSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 90);
}

function pick(list, index) {
  return list[index % list.length];
}

function previousAndNext(chapters, chapterIndex, lessonIndex) {
  const flat = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ lesson, chapter })));
  const currentId = chapters[chapterIndex].lessons[lessonIndex].id;
  const index = flat.findIndex((item) => item.lesson.id === currentId);
  return {
    previous: index > 0 ? flat[index - 1].lesson.title : null,
    next: index < flat.length - 1 ? flat[index + 1].lesson.title : null,
  };
}

function buildTextSections(course, chapters, chapter, lesson, chapterIndex, lessonIndex) {
  const sequence = chapterIndex * 3 + lessonIndex;
  const video = pick(course.videos, sequence);
  const image = thumbnail(video[0]);
  const focus = cleanTitle(lesson.title);
  const chapterTitle = cleanTitle(chapter.title);
  const { previous, next } = previousAndNext(chapters, chapterIndex, lessonIndex);
  const dimension = pick(course.dimensions, sequence);
  const secondaryDimension = pick(course.dimensions, sequence + 2);
  const dataA = pick(course.dataPoints, sequence);
  const dataB = pick(course.dataPoints, sequence + 1);
  const dataC = pick(course.dataPoints, sequence + 2);
  const controlA = pick(course.controls, sequence);
  const controlB = pick(course.controls, sequence + 1);
  const controlC = pick(course.controls, sequence + 2);
  const previousText = previous
    ? `Bài trước, "${cleanTitle(previous)}", đã tạo nền cho dữ liệu và thuật ngữ của bài này.`
    : "Đây là bài mở đầu của mạch học nên cần thống nhất thuật ngữ, nguồn chuẩn và cách ghi bằng chứng.";
  const nextText = next
    ? `Bài tiếp theo, "${cleanTitle(next)}", sẽ dùng kết quả của bài này như dữ liệu đầu vào.`
    : "Đây là bài cuối của mạch học nên cần tổng hợp kết quả thành checklist cá nhân và kế hoạch ôn tập.";

  return [
    {
      title: "Chuẩn năng lực, phạm vi áp dụng và giới hạn pháp lý",
      content: `<figure><img src="${image}" alt="Minh họa ${course.title}" /><figcaption>Ảnh minh họa cho bối cảnh học tập của bài. Video liên quan được đặt ở mục VIDEO riêng, không gắn trong phần đọc.</figcaption></figure>
<p><strong>${focus}</strong> thuộc chương <strong>${chapterTitle}</strong> của khóa <strong>${course.title}</strong>. ${previousText} Bài này được viết cho ${course.operatorFrame}; vì vậy cách trình bày ưu tiên tình huống thực tế, bằng chứng có thể kiểm tra và giới hạn trách nhiệm rõ ràng.</p>
<p>Chuẩn tham chiếu của bài là <strong>${course.standardLine}</strong>. STCW định hướng năng lực và watchkeeping ở cấp quốc tế; các bộ quy tắc như ISM, COLREG, SOLAS, FAL hoặc IALA cung cấp khung vận hành theo từng miền chuyên môn. Khi học, học viên cần phân biệt ba lớp: yêu cầu pháp lý, quy trình của công ty/tàu và điều kiện thực tế tại hiện trường.</p>
<p>Trọng tâm nghiệp vụ ở bài này là <strong>${dimension}</strong>. Nếu chỉ ghi nhớ thuật ngữ, học viên dễ đưa ra quyết định rời rạc. Cách tiếp cận chuyên nghiệp là chuyển thuật ngữ thành chuỗi câu hỏi: dữ liệu nào đã được kiểm chứng, ai là người sở hữu dữ liệu, giới hạn an toàn nào đang bị đe dọa, quyết định nào cần phê duyệt và hồ sơ nào chứng minh rằng quyết định đã được thực hiện.</p>
<p>Trong môi trường hàng hải, sai lệch nhỏ ở dữ liệu có thể tạo ra rủi ro tích lũy. Ví dụ: một giá trị chưa kiểm chứng, một checklist thiếu chữ ký, một thông tin VHF không được lặp lại, hoặc một mốc cut-off bị hiểu sai đều có thể làm hỏng chuỗi kiểm soát. Vì vậy, bài học yêu cầu học viên luôn gắn kiến thức với bằng chứng: ${dataA}, ${dataB}, ${dataC}.</p>
<p>Lưu ý quan trọng: tài liệu học tập này không thay thế công ước, luật quốc gia, hướng dẫn của cảng, quy trình SMS hoặc chỉ thị của thuyền trưởng/công ty. Khi có xung đột, học viên phải ưu tiên văn bản pháp quy và quy trình được phê duyệt chính thức, đồng thời ghi nhận lý do xử lý ngoại lệ.</p>
<h4>Nguồn tham chiếu chính</h4><ul>${htmlRefs(course.officialRefs)}</ul>`,
    },
    {
      title: "Nền tảng kỹ thuật và dữ liệu cần kiểm chứng",
      content: `<p>Muốn vận dụng <strong>${focus}</strong> ở cấp thuyền viên có chứng chỉ, học viên phải hiểu cơ chế tạo ra dữ liệu chứ không chỉ đọc kết quả cuối cùng. Dữ liệu hàng hải thường đi qua nhiều bước: quan sát, đo lường, nhập liệu, truyền đạt, xác nhận và lưu hồ sơ. Mỗi bước đều có sai số kỹ thuật hoặc sai số con người.</p>
<p>Trong bài này, <strong>${dataA}</strong> là dữ liệu đầu vào chính, <strong>${dataB}</strong> là dữ liệu kiểm chứng chéo và <strong>${dataC}</strong> là dữ liệu dùng để bàn giao hoặc hậu kiểm. Ba nhóm này không được thay thế lẫn nhau. Một dữ liệu có thể hữu ích cho nhận thức tình huống nhưng chưa đủ làm bằng chứng pháp lý; ngược lại, một biểu mẫu đầy đủ chữ ký vẫn có thể sai nếu nguồn đo ban đầu không đáng tin cậy.</p>
<table>
  <thead><tr><th>Nhóm dữ liệu</th><th>Câu hỏi kỹ thuật</th><th>Lỗi thường gặp</th><th>Cách kiểm soát</th></tr></thead>
  <tbody>
    <tr><td>${dataA}</td><td>Nguồn dữ liệu phát sinh ở đâu, thời điểm nào, bằng thiết bị hoặc người nào?</td><td>Chép lại số liệu mà không ghi thời điểm, không ghi điều kiện đo hoặc không biết phiên bản tài liệu.</td><td>Ghi nguồn, thời gian, người xác nhận và điều kiện sử dụng.</td></tr>
    <tr><td>${dataB}</td><td>Dữ liệu này có thể kiểm chứng bằng kênh độc lập nào?</td><td>Chỉ tin một màn hình, một người báo miệng hoặc một chứng từ chưa đối chiếu.</td><td>Dùng kiểm chứng chéo và ghi sai khác nếu có.</td></tr>
    <tr><td>${dataC}</td><td>Dữ liệu nào phải bàn giao để người sau hiểu đúng tình trạng còn mở?</td><td>Chỉ ghi kết quả cuối cùng, bỏ qua cảnh báo, giả định hoặc quyết định chưa phê duyệt.</td><td>Bàn giao trạng thái, rủi ro còn lại, người chịu trách nhiệm và hạn xử lý.</td></tr>
  </tbody>
</table>
<p>Về mặt khoa học quản trị rủi ro, bài này dùng tư duy "barrier management": một sự cố thường xảy ra khi nhiều lớp phòng vệ cùng yếu đi. Các lớp phòng vệ có thể là con người, thiết bị, quy trình, thông tin hoặc thời gian. Học viên cần mô tả được lớp nào đang suy giảm, vì sao suy giảm và hành động nào phục hồi lớp đó nhanh nhất.</p>
<p>Ba nguyên tắc kiểm chứng nên được dùng xuyên suốt khóa học: thứ nhất, dữ liệu quan trọng phải có nguồn độc lập; thứ hai, quyết định có rủi ro cao phải có tiêu chí dừng hoặc tiêu chí gọi cấp cao hơn; thứ ba, hồ sơ phải đủ để một người không có mặt tại hiện trường vẫn hiểu được chuỗi quyết định.</p>`,
    },
    {
      title: "Sơ đồ nghiệp vụ, ma trận quyết định và điểm kiểm soát",
      content: `<p>Sơ đồ dưới đây biến nội dung của <strong>${focus}</strong> thành quy trình hành động. Mục tiêu không phải tạo thêm giấy tờ, mà giúp học viên suy nghĩ có cấu trúc khi áp lực thời gian cao, thông tin không đầy đủ hoặc nhiều bên liên quan cùng yêu cầu xử lý.</p>
<table>
  <thead><tr><th>Bước</th><th>Hành động bắt buộc</th><th>Điểm kiểm soát</th><th>Bằng chứng</th></tr></thead>
  <tbody>
    <tr><td>1. Nhận diện</td><td>Mô tả tình huống bằng dữ kiện quan sát được.</td><td>Không dùng suy đoán thay cho dữ liệu.</td><td>Ảnh, thời gian, vị trí, người báo cáo, ${dataA}.</td></tr>
    <tr><td>2. Phân loại</td><td>Xác định rủi ro chính đối với ${dimension} và ${secondaryDimension}.</td><td>So sánh hậu quả với khả năng xảy ra.</td><td>Ma trận rủi ro, log ca, dữ liệu thiết bị hoặc chứng từ.</td></tr>
    <tr><td>3. Kiểm soát</td><td>Chọn hành động theo thứ tự: loại bỏ, giảm thiểu, cô lập, cảnh báo, theo dõi.</td><td>Hành động có người chịu trách nhiệm và thời hạn rõ ràng.</td><td>Checklist, permit, thông báo, biên bản hoặc cập nhật hệ thống.</td></tr>
    <tr><td>4. Xác nhận</td><td>Đánh giá lại sau hành động và xác nhận rủi ro còn lại.</td><td>Không đóng vấn đề khi còn điều kiện chưa kiểm chứng.</td><td>Ghi nhận kết quả, người xác nhận, thời điểm xác nhận.</td></tr>
    <tr><td>5. Bàn giao</td><td>Chuyển giao trạng thái mở cho người/ca/bộ phận kế tiếp.</td><td>Người nhận lặp lại đúng tình trạng và hành động tiếp theo.</td><td>Handover note, email, VHF log, hệ thống cảng hoặc nhật ký tàu.</td></tr>
  </tbody>
</table>
<h4>Ma trận quyết định rút gọn</h4>
<table>
  <thead><tr><th>Mức rủi ro</th><th>Dấu hiệu nhận biết</th><th>Hành động chuyên nghiệp</th></tr></thead>
  <tbody>
    <tr><td>Thấp</td><td>Dữ liệu thống nhất, tác động cục bộ, còn đủ thời gian kiểm tra.</td><td>Tiếp tục theo checklist và ghi hồ sơ tối thiểu.</td></tr>
    <tr><td>Trung bình</td><td>Có sai khác dữ liệu, cần phối hợp nhiều bên hoặc ảnh hưởng lịch vận hành.</td><td>Kích hoạt ${controlA}, thông báo người phụ trách và tăng tần suất kiểm tra.</td></tr>
    <tr><td>Cao</td><td>Đe dọa an toàn người/tàu/hàng/môi trường hoặc có giới hạn pháp lý bị chạm.</td><td>Dừng hoặc giảm hoạt động, gọi cấp có thẩm quyền, dùng ${controlB} và ghi bằng chứng đầy đủ.</td></tr>
    <tr><td>Không chấp nhận</td><td>Không đủ dữ liệu, mất lớp phòng vệ quan trọng hoặc không ai có thẩm quyền xác nhận.</td><td>Áp dụng ${controlC}, cô lập rủi ro và không tiếp tục cho đến khi có quyết định chính thức.</td></tr>
  </tbody>
</table>
<p>${nextText} Khi hoàn thành mục này, học viên phải có thể vẽ lại sơ đồ trên bằng ngôn ngữ của bài học và thay ví dụ bằng tình huống thật trong ca trực hoặc hoạt động cảng.</p>`,
    },
    {
      title: "Tình huống mô phỏng cho thuyền viên có chứng chỉ",
      content: `<p><strong>Bối cảnh:</strong> trong một ca làm việc có áp lực thời gian, bạn nhận được tín hiệu cho thấy dữ liệu về <strong>${dimension}</strong> không thống nhất với dữ liệu về <strong>${secondaryDimension}</strong>. Một bên liên quan muốn tiếp tục hoạt động để giữ lịch, trong khi một người khác yêu cầu dừng để kiểm tra. Nhiệm vụ của bạn là đưa ra đề xuất có thể bảo vệ bằng chứng.</p>
<p>Hãy xử lý tình huống theo ba lớp. Lớp thứ nhất là an toàn tức thời: có ai đang ở vùng nguy hiểm, thiết bị nào đang ở trạng thái không ổn định, có cần giảm tốc độ hoặc dừng thao tác không. Lớp thứ hai là chuẩn và quy trình: yêu cầu nào trong ${course.standardLine} hoặc quy trình nội bộ liên quan đến quyết định này. Lớp thứ ba là truyền đạt: ai phải được thông báo, thông báo bằng kênh nào và cần xác nhận lại như thế nào.</p>
<ol>
  <li>Viết mô tả tình huống trong một câu, chỉ dùng dữ kiện quan sát được.</li>
  <li>Ghi ba dữ liệu cần kiểm chứng ngay: ${dataA}, ${dataB}, ${dataC}.</li>
  <li>Chọn một hành động kiểm soát chính và nêu lý do theo mức rủi ro.</li>
  <li>Chỉ định người phải phê duyệt hoặc ít nhất phải được thông báo.</li>
  <li>Ghi bằng chứng sau hành động để người khác kiểm tra lại được quyết định.</li>
</ol>
<p><strong>Yêu cầu phản biện:</strong> sau khi chọn hành động, hãy tự hỏi điều gì sẽ chứng minh rằng quyết định của bạn sai. Nếu không trả lời được, nghĩa là bạn chưa kiểm tra đủ giả định. Ví dụ, nếu quyết định dựa vào một số đo, hãy xác định thiết bị khác hoặc người khác có thể xác nhận số đo. Nếu quyết định dựa vào một quy trình, hãy kiểm tra phiên bản tài liệu và phạm vi áp dụng.</p>
<p>Trong báo cáo cuối mục, học viên không được viết chung chung như "làm theo quy trình" hoặc "báo cáo cấp trên". Câu trả lời đạt yêu cầu phải nêu rõ quy trình nào, báo cáo cho ai, bằng kênh nào, trong bao lâu, bằng chứng nào được lưu và điều kiện nào cho phép tiếp tục hoạt động.</p>
<p>Thực hành này giúp học viên xây dựng thói quen của các tổ chức vận hành lớn: quyết định quan trọng không phụ thuộc vào trí nhớ cá nhân mà phụ thuộc vào hệ thống dữ liệu, kiểm chứng, vai trò và hồ sơ.</p>`,
    },
    {
      title: "Checklist đánh giá năng lực và hồ sơ cần nộp",
      content: `<p>Mục này dùng để tự đánh giá sau khi đọc bài, xem video riêng và tải tài liệu đính kèm. Học viên nên hoàn thành checklist trước khi đánh dấu bài đã học xong.</p>
<table>
  <thead><tr><th>Tiêu chí</th><th>Đạt yêu cầu khi</th><th>Bằng chứng học viên cần tạo</th></tr></thead>
  <tbody>
    <tr><td>Hiểu chuẩn</td><td>Giải thích được vì sao ${course.standardLine} liên quan đến ${focus}.</td><td>Một đoạn tóm tắt 80-120 từ bằng tiếng Việt chuẩn nghiệp vụ.</td></tr>
    <tr><td>Kiểm chứng dữ liệu</td><td>Phân biệt được dữ liệu đầu vào, dữ liệu kiểm chứng chéo và dữ liệu bàn giao.</td><td>Bảng ba cột chứa ${dataA}, ${dataB}, ${dataC}.</td></tr>
    <tr><td>Ra quyết định</td><td>Chọn được hành động phù hợp với mức rủi ro và quyền hạn.</td><td>Ma trận rủi ro ngắn có hành động ưu tiên.</td></tr>
    <tr><td>Truyền đạt</td><td>Chỉ rõ người nhận thông tin, kênh truyền đạt và cách xác nhận lại.</td><td>Mẫu thông báo hoặc handover note.</td></tr>
    <tr><td>Lưu hồ sơ</td><td>Hồ sơ đủ để người khác truy vết quyết định sau ca trực.</td><td>Checklist, log hoặc biểu mẫu Word đính kèm đã điền thử.</td></tr>
  </tbody>
</table>
<h4>Câu hỏi ôn tập chuyên sâu</h4>
<ul>
  <li>Nếu ${dataA} và ${dataB} mâu thuẫn, bạn tin nguồn nào trước và vì sao?</li>
  <li>Khi nào cần dùng quyền dừng công việc hoặc gọi cấp có thẩm quyền cao hơn?</li>
  <li>Bằng chứng nào chứng minh rằng ${controlA} đã được thực hiện chứ không chỉ được nói miệng?</li>
  <li>Điều gì phải được bàn giao cho ca/bộ phận kế tiếp để tránh mất nhận thức tình huống?</li>
  <li>Nếu xảy ra near-miss, dữ liệu nào trong bài này giúp phân tích nguyên nhân gốc?</li>
</ul>
<p>Hoàn thành bài học không chỉ là đọc hết nội dung. Chuẩn đạt là học viên có thể dùng nội dung bài để xử lý một tình huống mới, giải thích quyết định bằng chuẩn tham chiếu và tạo hồ sơ đủ chất lượng cho kiểm tra nội bộ hoặc đánh giá sau sự cố.</p>`,
    },
  ].map((section, index) => ({
    type: "TEXT",
    title: section.title,
    content: section.content,
    orderIndex: index,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
  }));
}

function videoPayload(course, sequence) {
  const [videoId, title] = pick(course.videos, sequence);
  return {
    type: "VIDEO",
    title: `Video riêng: ${title}`,
    content:
      "Video được tách thành một mục học riêng để học viên xem trong trình phát của LMS, theo dõi tiến độ và không bị ngắt mạch đọc của bài text.",
    videoUrl: videoUrl(videoId),
    videoType: "YOUTUBE",
    orderIndex: 5,
    duration: 10,
    isRequired: false,
    completionThreshold: 80,
  };
}

function pdfPayload(source) {
  return {
    type: "FILE",
    title: `PDF chính thức: ${source.title}`,
    content:
      `Tài liệu PDF từ ${source.source}. Học viên dùng tài liệu này để đối chiếu khái niệm, thuật ngữ và phạm vi áp dụng trước khi làm tình huống thực hành.`,
    orderIndex: 6,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
  };
}

function wordPayload(lesson) {
  return {
    type: "FILE",
    title: `Biểu mẫu Word thực hành: ${cleanTitle(lesson.title)}`,
    content:
      "File Word đi kèm để học viên ghi dữ liệu tình huống, ma trận rủi ro, quyết định, bằng chứng và phần bàn giao. Đây là hồ sơ thực hành, không phải tài liệu đọc thay thế.",
    orderIndex: 7,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
  };
}

function buildWordHtml(course, chapter, lesson, chapterIndex, lessonIndex) {
  const sequence = chapterIndex * 3 + lessonIndex;
  const dimension = pick(course.dimensions, sequence);
  const dataA = pick(course.dataPoints, sequence);
  const dataB = pick(course.dataPoints, sequence + 1);
  const dataC = pick(course.dataPoints, sequence + 2);
  const controlA = pick(course.controls, sequence);
  const controlB = pick(course.controls, sequence + 1);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Biểu mẫu thực hành - ${cleanTitle(lesson.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.45; color: #1f2937; }
    h1 { font-size: 20px; }
    h2 { font-size: 16px; margin-top: 18px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0 16px; }
    th, td { border: 1px solid #9ca3af; padding: 8px; vertical-align: top; }
    th { background: #e5eef9; }
  </style>
</head>
<body>
  <h1>Biểu mẫu thực hành: ${cleanTitle(lesson.title)}</h1>
  <p><strong>Khóa:</strong> ${course.title}</p>
  <p><strong>Chương:</strong> ${cleanTitle(chapter.title)}</p>
  <p><strong>Chuẩn tham chiếu:</strong> ${course.standardLine}</p>
  <h2>1. Mô tả tình huống</h2>
  <table>
    <tr><th>Thời gian/vị trí</th><td></td></tr>
    <tr><th>Dữ kiện quan sát được</th><td></td></tr>
    <tr><th>Phạm vi ảnh hưởng đến ${dimension}</th><td></td></tr>
  </table>
  <h2>2. Dữ liệu cần kiểm chứng</h2>
  <table>
    <tr><th>Dữ liệu</th><th>Nguồn</th><th>Người xác nhận</th><th>Ghi chú sai khác</th></tr>
    <tr><td>${dataA}</td><td></td><td></td><td></td></tr>
    <tr><td>${dataB}</td><td></td><td></td><td></td></tr>
    <tr><td>${dataC}</td><td></td><td></td><td></td></tr>
  </table>
  <h2>3. Ma trận rủi ro rút gọn</h2>
  <table>
    <tr><th>Nguy cơ</th><th>Khả năng</th><th>Hậu quả</th><th>Mức rủi ro</th><th>Kiểm soát</th></tr>
    <tr><td></td><td>Thấp / Trung bình / Cao</td><td>Thấp / Trung bình / Cao</td><td></td><td>${controlA}</td></tr>
    <tr><td></td><td>Thấp / Trung bình / Cao</td><td>Thấp / Trung bình / Cao</td><td></td><td>${controlB}</td></tr>
  </table>
  <h2>4. Quyết định và bàn giao</h2>
  <table>
    <tr><th>Hành động ưu tiên</th><td></td></tr>
    <tr><th>Người phê duyệt/thông báo</th><td></td></tr>
    <tr><th>Bằng chứng đã lưu</th><td></td></tr>
    <tr><th>Thông tin bàn giao cho ca/bộ phận tiếp theo</th><td></td></tr>
  </table>
</body>
</html>`;
}

function existingSections(lesson) {
  return [...(lesson.sections || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

function findFileSection(lesson, prefix) {
  return existingSections(lesson).find((section) => section.type === "FILE" && (section.title || "").startsWith(prefix));
}

async function upsertTextSections(course, chapters, chapter, lesson, chapterIndex, lessonIndex, token) {
  const textBlocks = existingSections(lesson).filter((section) => section.type === "TEXT");
  const payloads = buildTextSections(course, chapters, chapter, lesson, chapterIndex, lessonIndex);
  let created = 0;
  let updated = 0;

  for (let index = 0; index < payloads.length; index += 1) {
    const current = textBlocks[index];
    if (current) {
      await sendSection("PUT", lesson.id, current.id, token, payloads[index]);
      updated += 1;
    } else {
      await sendSection("POST", lesson.id, null, token, payloads[index]);
      created += 1;
    }
  }
  return { created, updated };
}

async function upsertVideo(course, lesson, sequence, token) {
  const existing = existingSections(lesson).find((section) => section.type === "VIDEO");
  await sendSection(existing ? "PUT" : "POST", lesson.id, existing?.id ?? null, token, videoPayload(course, sequence));
  return existing ? "updated" : "created";
}

async function upsertPdf(course, lesson, source, token) {
  const existing = findFileSection(lesson, "PDF chính thức:");
  const payload = pdfPayload(source);
  let file = null;

  if (course._uploadedPdfs.has(source.key)) {
    Object.assign(payload, course._uploadedPdfs.get(source.key));
  } else if (existing?.fileUrl) {
    const cached = { fileUrl: existing.fileUrl, fileName: existing.fileName || source.fileName };
    course._uploadedPdfs.set(source.key, cached);
    Object.assign(payload, cached);
  } else {
    file = await fetchAttachmentFile(source);
  }

  const response = await sendSection(existing ? "PUT" : "POST", lesson.id, existing?.id ?? null, token, payload, file);
  const saved = extractSavedSection(response);
  if (saved.fileUrl) {
    course._uploadedPdfs.set(source.key, { fileUrl: saved.fileUrl, fileName: saved.fileName || source.fileName });
  }
  return existing ? "updated" : "created";
}

async function upsertWord(course, chapter, lesson, chapterIndex, lessonIndex, token) {
  const existing = findFileSection(lesson, "Biểu mẫu Word thực hành:");
  const fileName = `${asciiSlug(course.categoryCode)}-${chapterIndex + 1}-${lessonIndex + 1}-${asciiSlug(lesson.title)}.doc`;
  const file = wordFile(fileName, buildWordHtml(course, chapter, lesson, chapterIndex, lessonIndex));
  await sendSection(existing ? "PUT" : "POST", lesson.id, existing?.id ?? null, token, wordPayload(lesson), file);
  return existing ? "updated" : "created";
}

function countSections(chapters) {
  const lessons = chapters.flatMap((chapter) => chapter.lessons || []);
  const sections = lessons.flatMap((lesson) => lesson.sections || []);
  const textSections = sections.filter((section) => section.type === "TEXT");
  const videoSections = sections.filter((section) => section.type === "VIDEO");
  const fileSections = sections.filter((section) => section.type === "FILE");
  const textWithYoutube = textSections.filter((section) => /youtube\.com|youtu\.be/i.test(section.content || ""));
  const avgTextLength = textSections.length
    ? Math.round(textSections.reduce((sum, section) => sum + (section.content || "").length, 0) / textSections.length)
    : 0;
  return {
    chapters: chapters.length,
    lessons: lessons.length,
    sections: sections.length,
    text: textSections.length,
    video: videoSections.length,
    file: fileSections.length,
    pdf: fileSections.filter((section) => /\.pdf(?:[?#]|$)/i.test(section.fileUrl || "")).length,
    word: fileSections.filter((section) => /\.(doc|docx)(?:[?#]|$)/i.test(section.fileUrl || "")).length,
    textWithYoutube: textWithYoutube.length,
    avgTextLength,
    missingFileUrl: fileSections.filter((section) => !section.fileUrl).length,
  };
}

console.log(`Logging in to ${baseUrl}...`);
const teacherToken = await login(args.get("--teacher-email"), args.get("--teacher-password"));
const adminToken = await login(args.get("--admin-email"), args.get("--admin-password"));
const studentToken = args.get("--student-email") && args.get("--student-password")
  ? await login(args.get("--student-email"), args.get("--student-password"))
  : null;

const categories = (await api("GET", "/api/v3/categories", teacherToken)).data;
const categoryByCode = new Map(categories.map((category) => [category.code, category.id]));
const summary = [];

for (const course of courses) {
  course._uploadedPdfs = new Map();
  const categoryId = categoryByCode.get(course.categoryCode);
  if (!categoryId) {
    throw new Error(`Missing category ${course.categoryCode}`);
  }

  console.log(`Updating course: ${course.title}`);
  await api("PUT", `/api/v3/courses/${course.id}`, teacherToken, {
    title: course.title,
    description: course.metadata.description,
    thumbnailUrl: thumbnail(course.thumbnailVideoId),
    categoryId,
    tags: [course.categoryCode, "STCW", "IMO", "PDF", "Word", "Video riêng", "Hàng hải"],
    welcomeMessage: course.metadata.welcomeMessage,
    courseInformation: course.metadata.courseInformation,
    benefits: course.metadata.benefits,
    credits: 4,
    visibility: "PUBLIC",
    priceType: "FREE",
    price: 0,
    salePrice: null,
    deliveryMode: "SELF_PACED",
    allowOfflineDownload: true,
  });

  const draft = await api("GET", `/api/v3/teacher/courses/${course.id}/draft/content`, teacherToken);
  const chapters = draft.data || [];
  let lessonsTouched = 0;
  let textCreated = 0;
  let textUpdated = 0;
  let videosCreated = 0;
  let videosUpdated = 0;
  let pdfCreated = 0;
  let pdfUpdated = 0;
  let wordCreated = 0;
  let wordUpdated = 0;

  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
    const chapter = chapters[chapterIndex];
    for (let lessonIndex = 0; lessonIndex < (chapter.lessons || []).length; lessonIndex += 1) {
      const lesson = chapter.lessons[lessonIndex];
      const sequence = chapterIndex * 3 + lessonIndex;

      const textResult = await upsertTextSections(course, chapters, chapter, lesson, chapterIndex, lessonIndex, teacherToken);
      textCreated += textResult.created;
      textUpdated += textResult.updated;

      const videoResult = await upsertVideo(course, lesson, sequence, teacherToken);
      if (videoResult === "created") videosCreated += 1;
      else videosUpdated += 1;

      const pdfSource = pick(course.pdfs, sequence);
      const pdfResult = await upsertPdf(course, lesson, pdfSource, teacherToken);
      if (pdfResult === "created") pdfCreated += 1;
      else pdfUpdated += 1;

      const wordResult = await upsertWord(course, chapter, lesson, chapterIndex, lessonIndex, teacherToken);
      if (wordResult === "created") wordCreated += 1;
      else wordUpdated += 1;

      lessonsTouched += 1;
    }
  }

  console.log(`Submitting and approving publication: ${course.title}`);
  await api("POST", `/api/v3/teacher/courses/${course.id}/submit-for-approval`, teacherToken, {
    releaseNotes:
      "Mở rộng toàn bộ bài học theo chuẩn STCW/IMO/IALA, tách video thành section riêng, bổ sung PDF chính thức và biểu mẫu Word thực hành cho từng bài.",
  });
  await api("PATCH", `/api/v3/admin/courses/${course.id}/approve`, adminToken, {
    comment:
      "Đã duyệt bản cập nhật học liệu chuyên sâu: nội dung text dài hơn, video riêng, PDF/Word đính kèm và nguồn tham chiếu hàng hải chính thức.",
  });

  const published = await api("GET", `/api/v3/courses/${course.id}/content`, studentToken || teacherToken);
  summary.push({
    title: course.title,
    lessonsTouched,
    textCreated,
    textUpdated,
    videosCreated,
    videosUpdated,
    pdfCreated,
    pdfUpdated,
    wordCreated,
    wordUpdated,
    published: countSections(published.data || []),
  });
}

console.log(JSON.stringify(summary, null, 2));

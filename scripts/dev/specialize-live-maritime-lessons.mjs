#!/usr/bin/env node

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) args.set(key, "true");
  else {
    args.set(key, next);
    i += 1;
  }
}

const baseUrl = (args.get("--base-url") || "https://holilihu.online").replace(/\/+$/, "");
for (const name of ["--teacher-email", "--teacher-password", "--admin-email", "--admin-password"]) {
  if (!args.get(name)) throw new Error(`Missing required argument: ${name}`);
}

const sources = {
  stcw: ["IMO STCW Convention", "https://www.imo.org/en/OurWork/HumanElement/Pages/STCW-Convention.aspx"],
  ism: ["IMO ISM Code", "https://www.imo.org/en/OurWork/HumanElement/Pages/ISMCode.aspx"],
  solas: ["IMO SOLAS Convention", "https://www.imo.org/en/about/conventions/pages/international-convention-for-the-safety-of-life-at-sea-%28solas%29%2C-1974.aspx"],
  marpol: ["IMO MARPOL Convention", "https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Prevention-of-Pollution-from-Ships-%28MARPOL%29.aspx"],
  fatigue: ["IMO fatigue guidance", "https://www.imo.org/en/OurWork/HumanElement/Pages/Fatigue.aspx"],
  colreg: ["IMO COLREG Convention", "https://www.imo.org/en/About/Conventions/Pages/COLREG.aspx"],
  iala: ["IALA R1001 Maritime Buoyage System", "https://www.iala.int/product/r1001/"],
  iho: ["IHO standards and ECDIS/ENC references", "https://iho.int/en/standards-and-specifications"],
  smcp: ["IMO Standard Marine Communication Phrases", "https://www.imo.org/en/OurWork/Safety/Pages/StandardMarineCommunicationPhrases.aspx"],
  vgm: ["IMO SOLAS verified gross mass guidance", "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/MSC.1%20Circ.1475.pdf"],
  fal: ["IMO Facilitation and FAL Convention", "https://www.imo.org/en/OurWork/Facilitation/Pages/Default.aspx"],
  imdg: ["IMO IMDG Code", "https://www.imo.org/en/OurWork/Safety/Pages/DangerousGoods-default.aspx"],
  csc: ["IMO safe containers", "https://www.imo.org/en/OurWork/Safety/Pages/Containers-default.aspx"],
  incoterms: ["ICC Incoterms rules", "https://iccwbo.org/business-solutions/incoterms-rules/"],
};

const courses = [
  {
    id: "b9a4ec3a-de91-4c23-a125-4be4f62e91fc",
    code: "SAFETY",
    title: "Quản lý An toàn Hàng hải và Ứng phó Sự cố",
    description:
      "Khóa học chuyên sâu về ISM/SMS, kiểm soát rủi ro, PCCC, cứu sinh, MARPOL, điều tra near-miss và CAPA. Nội dung được viết theo từng nghiệp vụ riêng, không tự bịa dữ liệu hoặc dùng ví dụ không có nguồn.",
    videos: [
      ["kMqaQ26zG0g", "International Safety Management Code"],
      ["5lzecgrflGk", "Risk Assessment and Management"],
      ["JnOibCb1Vz4", "ISM plans, procedures and work permits"],
      ["ZCKuKQQydZ0", "Ship fire safety and SOLAS fire divisions"],
      ["zY_Mf4U5P6I", "Emergency procedures on board"],
      ["eJTuwUO2RgU", "Survival craft and rescue boat training"],
      ["UCqfQPf9-XA", "MARPOL electronic record books"],
      ["vzFjKo1F5nY", "Shipboard Oil Pollution Emergency Plan"],
      ["j768_qlKN1M", "Port State Control inspections"],
      ["v7e8XJPZPGw", "Near-miss reporting"],
      ["wSdeH2JhAZM", "Incident investigations and root causes"],
      ["1CO66gGD1E4", "Major non-conformity and observation"],
      ["zTbsqQIl0p0", "Ship fire drill and SOLAS drill report"],
      ["6vS1ZFAvFbs", "Ship safety training"],
      ["pBz1CHX3YdY", "STCW convention overview"],
    ],
    lessons: [
      p("Tư duy hệ thống trong ISM Code", "ISM/SMS: chính sách, trách nhiệm, quy trình, nguồn lực, kiểm tra và cải tiến", ["mục tiêu an toàn của SMS", "vai trò Designated Person Ashore", "quyền hạn của thuyền trưởng", "đánh giá hiệu lực quy trình"], ["sổ tay SMS", "master review", "internal audit", "non-conformity record"], "sms", ["ism", "stcw"], "Bản đồ trách nhiệm SMS"),
      p("Ma trận rủi ro cho công việc trên tàu", "Đánh giá rủi ro trước công việc, dynamic risk assessment và mức kiểm soát còn lại", ["likelihood/consequence", "hierarchy of controls", "ALARP như nguyên tắc quản trị", "toolbox talk"], ["risk assessment form", "toolbox record", "permit", "ảnh hiện trường"], "matrix", ["ism", "stcw"], "Ma trận rủi ro có bằng chứng"),
      p("Permit to work và kiểm soát thay đổi", "PTW cho hot work/enclosed space/working aloft/electrical isolation và Management of Change", ["xác định năng lượng nguy hiểm", "cô lập và thử khí", "simultaneous operations", "đóng permit sau kiểm tra"], ["permit to work", "gas test record", "isolation certificate", "handover note"], "permit", ["ism", "solas"], "Luồng permit và MOC"),
      p("Tam giác cháy và nguồn đánh lửa trên tàu", "Cơ chế cháy, nguồn đánh lửa, phân vùng nguy cơ và kiểm soát hot work", ["fuel-oxygen-heat", "class of fire", "fixed fire-fighting system", "fire watch"], ["hot-work permit", "gas-free certificate", "fire patrol log", "equipment readiness"], "fire", ["solas", "ism"], "Tam giác cháy và lớp kiểm soát"),
      p("Muster list, tín hiệu báo động và tuyến thoát nạn", "Tổ chức muster, trách nhiệm cá nhân, đường thoát và kiểm tra sẵn sàng cứu sinh", ["muster station", "alarm signal", "escape route", "head count"], ["muster list", "drill attendance", "escape route inspection", "LSA checklist"], "muster", ["solas", "stcw"], "Luồng muster và xác nhận quân số"),
      p("Ra quyết định trong tình huống bỏ tàu", "Nguyên tắc quyết định abandon ship, thông tin distress và chuẩn bị survival craft", ["quyền quyết định của thuyền trưởng", "distress alert", "survival craft readiness", "accountability"], ["GMDSS log", "abandon ship checklist", "EPIRB/SART readiness", "muster confirmation"], "abandon", ["solas", "stcw"], "Chuỗi quyết định bỏ tàu"),
      p("MARPOL trong khai thác thường ngày", "Kiểm soát xả thải, ghi sổ và ngăn ngừa ô nhiễm theo từng dòng vận hành", ["Annex I oil pollution", "garbage management", "record book integrity", "operational discharge limits"], ["Oil Record Book", "Garbage Record Book", "bunker checklist", "sludge/bilge record"], "marpol", ["marpol", "ism"], "Luồng MARPOL hằng ngày"),
      p("Quy trình ứng phó tràn dầu trên boong theo SOPEP", "Ứng phó tràn dầu: an toàn người, chặn nguồn, khoanh vùng, thông báo và thu gom", ["source control", "scupper plugging", "spill kit deployment", "notification chain"], ["SOPEP/SMPEP extract", "spill log", "photo evidence", "notification record"], "spill", ["marpol", "ism"], "Chuỗi SOPEP trên boong"),
      p("Làm việc với cảng và cơ quan chức năng", "Trao đổi với cảng, PSC, chính quyền ven biển và công ty sau sự cố", ["initial notification", "evidence preservation", "single point of contact", "legal privilege awareness"], ["port notification", "company report", "witness note", "document register"], "authority", ["marpol", "ism"], "Dòng báo cáo với bên ngoài"),
      p("Near-miss không phải lỗi cá nhân", "Just culture, báo cáo near-miss và chỉ số dẫn dắt an toàn", ["no-blame reporting", "learning culture", "leading indicator", "unsafe condition"], ["near-miss report", "hazard observation", "safety meeting minute", "trend log"], "nearmiss", ["ism", "stcw"], "Luồng học từ near-miss"),
      p("Phân tích nguyên nhân gốc", "Barrier analysis, 5-Why và phân biệt nguyên nhân trực tiếp với nguyên nhân hệ thống", ["direct cause", "root cause", "failed barrier", "human factors"], ["timeline", "barrier table", "interview note", "evidence index"], "rootcause", ["ism"], "Sơ đồ nguyên nhân và lớp phòng vệ"),
      p("Theo dõi CAPA sau sự cố", "Corrective/preventive action, owner, deadline và kiểm chứng hiệu lực", ["corrective action", "preventive action", "effectiveness check", "management review"], ["CAPA register", "closure evidence", "verification record", "audit follow-up"], "capa", ["ism"], "Vòng đời CAPA"),
      p("Thiết kế một buổi diễn tập có mục tiêu", "Lập mục tiêu diễn tập theo năng lực cần kiểm chứng, không dựa vào ví dụ rời rạc thiếu nguồn", ["drill objective", "observable behavior", "role assignment", "evaluation criteria"], ["drill plan", "attendance", "observer sheet", "equipment checklist"], "drill", ["solas", "stcw"], "Thiết kế drill dựa trên năng lực"),
      p("Debrief sau diễn tập", "Hot debrief, cold debrief và chuyển bài học thành hành động có chủ sở hữu", ["psychological safety", "fact-first debrief", "lesson learned", "action owner"], ["debrief note", "learning log", "CAPA link", "training record"], "debrief", ["ism", "stcw"], "Luồng debrief thành cải tiến"),
      p("Bài kiểm tra cuối khóa", "Hồ sơ năng lực cuối khóa: bằng chứng, quyết định, nguồn chuẩn và tự đánh giá", ["competence evidence", "portfolio review", "standard mapping", "self-assessment"], ["portfolio", "source list", "completed checklist", "reflection note"], "portfolio", ["stcw", "ism"], "Bản đồ năng lực cuối khóa"),
    ],
  },
  {
    id: "028f3020-e811-41dd-8164-efc15097fc69",
    code: "NAVIGATION",
    title: "Dẫn đường và Trực ca Buồng lái theo STCW",
    description:
      "Khóa học chuyên sâu về trực ca buồng lái, COLREG, ECDIS/ENC, Radar/ARPA/AIS, IALA, VHF/SMCP, VTS và bàn giao ca. Nội dung từng bài bám đúng nghiệp vụ cầu lái, không tự bịa dữ liệu hoặc dùng ví dụ không có nguồn.",
    videos: [
      ["QSCxgFsYABs", "Duties of the Officer of the Watch"],
      ["rY0GUwvakEs", "COLREG Rule 5 lookout"],
      ["TXLhKhFIECo", "Handing over the watch"],
      ["4z6C6GvNvBE", "Electronic Navigational Charts"],
      ["s5ebZQru7mg", "Route planning with ECDIS"],
      ["PlTDR9UvoQI", "ECDIS safety depth practice"],
      ["RVbuQqYYjRs", "Radar sea clutter and rain clutter"],
      ["NJse0-UG9oo", "ARPA trial maneuver"],
      ["Fm6EDcmew2o", "AIS and radar cross-check"],
      ["fsWoDtcphS0", "IALA buoyage overview"],
      ["JfiMgghaqFs", "VHF communication with SMCP message markers"],
      ["AbFF7mSqZFs", "Bridge team duty during pilotage"],
      ["u4f9TlPXLYo", "Bridge procedures checklist and pilot card"],
      ["6sKJb1-ceIg", "STCW watchkeeping standards"],
      ["d3ANEOGvc94", "Bridge Resource Management"],
    ],
    lessons: [
      p("Vai trò của sĩ quan trực ca", "OOW: trách nhiệm ca trực, standing orders, master call criteria và bridge resource management", ["continuous watch", "master standing orders", "situational awareness", "decision escalation"], ["night order book", "bell book/log", "standing order", "watch handover"], "oow", ["stcw", "colreg"], "Trách nhiệm OOW"),
      p("Cảnh giới bằng mắt, tai và thiết bị", "COLREG Rule 5: duy trì cảnh giới bằng mọi phương tiện phù hợp", ["visual lookout", "hearing", "radar use", "all available means"], ["lookout assignment", "visibility note", "radar setting record", "watch log"], "lookout", ["colreg", "stcw"], "Cảnh giới đa nguồn"),
      p("Bàn giao ca trực không mất thông tin", "Handover ca trực: trạng thái tàu, traffic, kế hoạch, cảnh báo và việc còn mở", ["position and track", "traffic picture", "equipment status", "open risks"], ["handover checklist", "position fix", "alarm list", "master instruction"], "handover", ["stcw"], "Luồng bàn giao OOW"),
      p("Các lớp thông tin trên hải đồ", "ENC/ECDIS layers, chart object, scale, update status và giới hạn hiển thị", ["ENC cell", "display category", "chart scale", "update status"], ["ENC permit", "update log", "route check report", "chart correction evidence"], "chart", ["iho", "solas"], "Lớp thông tin ENC"),
      p("Lập kế hoạch hành trình theo berth to berth", "Passage planning từ cầu bến đến cầu bến: appraisal, planning, execution, monitoring", ["no-go area", "wheel-over point", "UKC policy", "contingency anchorage"], ["passage plan", "master approval", "route check", "pilotage note"], "passage", ["stcw", "solas"], "Luồng passage plan"),
      p("Giám sát ECDIS không phụ thuộc mù quáng", "ECDIS monitoring: safety contour, safety depth, cross-track limit và alarm management", ["safety contour", "safety depth", "look-ahead alarm", "overreliance control"], ["ECDIS settings", "alarm log", "manual fix", "cross-check note"], "ecdis", ["iho", "solas"], "Kiểm chứng ECDIS"),
      p("Radar picture và nhiễu thường gặp", "Radar picture: gain, sea/rain clutter, shadow sector và target discrimination", ["gain tuning", "sea clutter", "rain clutter", "blind sector"], ["radar setting note", "target plot", "weather observation", "equipment status"], "radar", ["stcw", "colreg"], "Dòng xử lý radar picture"),
      p("ARPA, CPA/TCPA và xu hướng nguy cơ", "ARPA: target acquisition, vector interpretation, CPA/TCPA và trial manoeuvre", ["relative vector", "true vector", "CPA/TCPA trend", "trial manoeuvre"], ["ARPA plot", "maneuver note", "COLREG assessment", "watch log"], "arpa", ["colreg", "stcw"], "Sơ đồ CPA/TCPA"),
      p("AIS và giới hạn của dữ liệu nhận dạng", "AIS là dữ liệu nhận dạng/hỗ trợ nhận thức, không thay thế cảnh giới và đánh giá COLREG", ["manual AIS fields", "latency", "wrong identity risk", "sensor cross-check"], ["AIS target note", "radar correlation", "visual bearing", "VHF log"], "ais", ["colreg", "solas"], "Kiểm chứng AIS"),
      p("Hệ thống phao tiêu IALA", "IALA R1001: lateral, cardinal, isolated danger, safe water và special marks", ["Region A/B lateral marks", "cardinal marks", "light rhythm", "chart symbol matching"], ["IALA reference", "pilotage plan", "visual report", "chart mark check"], "iala", ["iala", "iho"], "Hệ thống phao tiêu IALA"),
      p("VHF và thông điệp ngắn, rõ, chuẩn", "VHF bridge communication: SMCP, message markers, read-back và logging", ["SMCP phrases", "message marker", "read-back", "distress/urgency/safety priority"], ["VHF log", "message script", "read-back confirmation", "time stamp"], "vhf", ["smcp", "stcw"], "Vòng lặp VHF chuẩn"),
      p("Làm việc với VTS và hoa tiêu", "VTS/pilotage: thông tin, lời khuyên, hướng dẫn và trách nhiệm điều khiển tàu", ["master-pilot exchange", "pilot card", "VTS reporting point", "shared mental model"], ["pilot card", "MPX checklist", "VTS log", "bridge team briefing"], "vts", ["stcw", "iala"], "Luồng MPX/VTS"),
      p("Thực hành tiếp cận luồng theo checklist", "Approach channel: speed, UKC, traffic density, wheel-over và abort point bằng dữ liệu thật", ["approach briefing", "UKC check", "abort point", "engine readiness"], ["approach checklist", "tide/current data", "pilotage plan", "engine status"], "approach", ["stcw", "iho"], "Checklist tiếp cận luồng"),
      p("Bàn giao sau tình huống phức tạp", "Post-event handover: điều đã xử lý, rủi ro còn mở, điều kiện chưa xác nhận và chỉ thị tiếp theo", ["open risk", "assumption log", "next action", "fatigue awareness"], ["handover note", "timeline", "traffic update", "master instruction"], "posthandover", ["stcw", "fatigue"], "Bàn giao sau sự kiện"),
      p("Bài kiểm tra cuối khóa", "Hồ sơ năng lực trực ca: nguồn chuẩn, nhật ký, dữ liệu kiểm chứng và tự đánh giá", ["competence map", "COLREG reasoning", "ECDIS/radar cross-check", "communication evidence"], ["portfolio", "route review", "watch log", "source list"], "navportfolio", ["stcw", "colreg", "iho"], "Bản đồ năng lực OOW"),
    ],
  },
  {
    id: "fba0e89a-0a36-44f7-8658-4ad77d4150c3",
    code: "LOGISTICS",
    title: "Logistics Hàng hải và Khai thác Cảng Cơ bản",
    description:
      "Khóa học chuyên sâu về chuỗi vận tải biển, chứng từ, Incoterms, container/CSC, VGM, IMDG, FAL, khai thác cảng và quản trị ngoại lệ. Nội dung từng bài bám quy trình và chuẩn quốc tế, không tự bịa dữ liệu hoặc dùng ví dụ không có nguồn.",
    videos: [
      ["PK7c9aOb8NQ", "Sea shipment cargo and document flow"],
      ["5pq8QAmz0q0", "MLO, NVOCC and freight forwarder roles"],
      ["w4CL6oDk8wI", "Container cut-off and SOLAS VGM risk"],
      ["R43v66aMLGY", "Shipping instruction data entry"],
      ["reAjDV9j09g", "Bill of lading types and samples"],
      ["tSQIlKI6OKc", "ICC Incoterms 2020 components"],
      ["tI98bDpy0Gc", "Seal and container door inspection"],
      ["2Hu446v6HV4", "Verified Gross Mass for export containers"],
      ["yngNeFfq5us", "IMDG Code fire and spillage schedules"],
      ["gix16RaUhxo", "Berthing in port operations"],
      ["KgE_iK_NGmE", "Container ship stowage organization"],
      ["0-QBp2ddZnQ", "Container terminal IoT operation"],
      ["6TzC9sXmL1Y", "Demurrage, detention and port storage"],
      ["fjAq8ySNaYc", "Container shipping exception and seasonality risk"],
      ["q-6cGTQPTM4", "e-FAL and port community system"],
    ],
    lessons: [
      p("Dòng hàng, dòng chứng từ và dòng tiền", "Ba dòng logistics biển và điểm kiểm soát giữa hàng hóa, chứng từ, chi phí", ["cargo flow", "document flow", "payment/cost flow", "exception ownership"], ["booking", "B/L draft", "invoice/debit note", "event timestamp"], "threeflows", ["fal"], "Ba dòng logistics biển"),
      p("Vai trò của hãng tàu, forwarder và đại lý", "Phân vai carrier, NVOCC/forwarder, ship agent, terminal, shipper và consignee", ["contractual carrier", "actual carrier", "agent authority", "data owner"], ["service contract", "booking confirmation", "agency instruction", "contact matrix"], "roles", ["fal"], "Ma trận vai trò"),
      p("Lịch tàu, cut-off và tính đúng thời điểm", "ETA/ETD, CY cut-off, SI cut-off, VGM cut-off và rủi ro sai mốc thời gian", ["schedule reliability", "document cut-off", "cargo cut-off", "timezone control"], ["schedule notice", "terminal cut-off", "SI receipt", "VGM timestamp"], "cutoff", ["fal", "vgm"], "Dòng thời gian cut-off"),
      p("Booking note và shipping instruction", "Dữ liệu booking/SI: parties, cargo, equipment, routing, marks and numbers", ["booking acceptance", "data completeness", "shipper/consignee fields", "cargo description"], ["booking note", "shipping instruction", "email trail", "data validation log"], "booking", ["fal"], "Luồng booking và SI"),
      p("Vận đơn đường biển và chức năng pháp lý", "Bill of lading: receipt, evidence of contract, document of title và rủi ro sửa nháp", ["receipt for goods", "evidence of carriage contract", "document of title", "clean/on-board notation"], ["B/L draft", "mate's receipt", "amendment history", "release instruction"], "bl", ["fal"], "Ba chức năng của B/L"),
      p("Incoterms trong phối hợp logistics", "Incoterms: phân chia rủi ro/chi phí/nghĩa vụ, không thay thế hợp đồng vận tải", ["delivery point", "risk transfer", "cost allocation", "marine terms"], ["sales contract", "Incoterms rule", "insurance note", "handover evidence"], "incoterms", ["incoterms"], "Điểm chuyển giao Incoterms"),
      p("Container hóa và kiểm soát seal", "Container inspection, CSC plate, seal control và chain of custody", ["CSC plate", "container condition", "seal number", "chain of custody"], ["EIR", "container inspection", "seal record", "photo evidence"], "seal", ["csc"], "Chuỗi kiểm soát container/seal"),
      p("VGM và trách nhiệm khai báo trọng lượng", "SOLAS VGM: shipper responsibility, Method 1/2 và điều kiện để container được xếp", ["shipper responsibility", "Method 1", "Method 2", "terminal/carrier transmission"], ["VGM declaration", "weighbridge ticket", "system timestamp", "carrier acknowledgement"], "vgm", ["vgm", "solas"], "Luồng VGM theo SOLAS"),
      p("Nhận diện hàng nguy hiểm theo IMDG", "IMDG basic recognition: UN number, proper shipping name, class, packing group, segregation", ["UN number", "proper shipping name", "hazard class", "segregation"], ["DGD", "SDS", "container placard", "stowage instruction"], "imdg", ["imdg"], "Cấu trúc nhận diện IMDG"),
      p("Berth planning và cửa sổ cầu bến", "Berth planning: ETA, berth window, tidal constraint, crane allocation và priority", ["berth window", "tidal window", "crane split", "berth conflict"], ["berth plan", "ETA update", "pilot/tug booking", "terminal notice"], "berth", ["fal"], "Luồng berth planning"),
      p("Yard planning và dòng container", "Yard planning: export/import/transshipment stacks, rehandle, reefer/dangerous segregation", ["yard block", "stack strategy", "rehandle minimization", "reefer/dangerous area"], ["yard plan", "container list", "DG segregation note", "reefer monitoring"], "yard", ["imdg", "csc"], "Dòng container trong yard"),
      p("Chỉ số năng suất cảng", "Port productivity: berth productivity, crane productivity, vessel turnaround, truck turn time", ["moves per hour", "berth occupancy", "vessel turnaround", "truck turn time"], ["terminal report", "crane log", "gate timestamp", "delay code"], "kpi", ["fal"], "Bản đồ KPI cảng"),
      p("Phí phát sinh và tranh chấp thường gặp", "Demurrage, detention, storage, amendment fee và cách kiểm tra chứng cứ thời gian", ["free time", "demurrage/detention", "storage", "evidence of delay"], ["tariff", "gate-in/out timestamp", "arrival notice", "dispute file"], "charges", ["fal"], "Dòng chứng cứ phí phát sinh"),
      p("Thực hành xử lý lô hàng trễ cut-off bằng dữ liệu thật", "Xử lý late cut-off bằng timestamp, trách nhiệm dữ liệu và phương án recover shipment", ["root timestamp", "responsibility split", "rollover option", "customer notification"], ["cut-off notice", "SI timestamp", "VGM timestamp", "recovery plan"], "latecutoff", ["fal", "vgm"], "Luồng xử lý trễ cut-off"),
      p("Bài kiểm tra cuối khóa", "Hồ sơ năng lực logistics: flow map, document pack, evidence trail và tự đánh giá", ["document pack", "flow map", "exception log", "source-based reasoning"], ["portfolio", "source list", "process map", "completed checklist"], "logportfolio", ["fal", "vgm", "imdg"], "Bản đồ năng lực logistics"),
    ],
  },
];

function p(title, standardFocus, concepts, evidence, diagram, sourceKeys, diagramTitle) {
  return { title, standardFocus, concepts, evidence, diagram, sourceKeys, diagramTitle };
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clean(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function sourceList(keys) {
  return keys
    .map((key) => sources[key])
    .filter(Boolean)
    .map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`)
    .join("");
}

function svgData(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function diagramSvg(course, profile, variant) {
  const svgFontStack = "'Montserrat', 'Segoe UI', Arial, sans-serif";
  const palette = {
    SAFETY: ["#0f766e", "#dc2626", "#f59e0b", "#0f172a"],
    NAVIGATION: ["#075985", "#2563eb", "#16a34a", "#0f172a"],
    LOGISTICS: ["#334155", "#0ea5e9", "#f97316", "#0f172a"],
  }[course.code] || ["#0f766e", "#2563eb", "#f59e0b", "#0f172a"];
  const [primary, accent, warn, ink] = palette;
  const concepts = profile.concepts.map(esc);
  const evidence = profile.evidence.map(esc);
  const title = esc(profile.diagramTitle || profile.title);
  const subtitle = esc(profile.standardFocus);

  const card = (x, y, w, h, label, fill = "#ffffff") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="#cbd5e1" stroke-width="1.4"/><text x="${x + 16}" y="${y + 27}" font-size="15" font-weight="700" fill="${ink}">${label}</text>`;
  const arrow = (x1, y1, x2, y2, color = primary) =>
    `<path d="M${x1} ${y1} C ${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" marker-end="url(#arrow)"/>`;

  let body = "";
  if (["matrix", "kpi"].includes(profile.diagram)) {
    body = `<rect x="72" y="108" width="540" height="250" rx="16" fill="#fff" stroke="#cbd5e1"/>
      ${[0, 1, 2].map((i) => `<line x1="${72 + (i + 1) * 135}" y1="108" x2="${72 + (i + 1) * 135}" y2="358" stroke="#e2e8f0"/>`).join("")}
      ${[0, 1, 2].map((i) => `<line x1="72" y1="${108 + (i + 1) * 62.5}" x2="612" y2="${108 + (i + 1) * 62.5}" stroke="#e2e8f0"/>`).join("")}
      <text x="92" y="142" font-size="13" font-weight="700" fill="${primary}">${concepts[0]}</text>
      <text x="225" y="204" font-size="13" font-weight="700" fill="${warn}">${concepts[1]}</text>
      <text x="360" y="267" font-size="13" font-weight="700" fill="${accent}">${concepts[2]}</text>
      <text x="495" y="330" font-size="13" font-weight="700" fill="${ink}">${concepts[3] || "evidence"}</text>
      ${card(650, 118, 210, 56, evidence[0] || "evidence", "#f8fafc")}
      ${card(650, 194, 210, 56, evidence[1] || "record", "#f8fafc")}
      ${card(650, 270, 210, 56, evidence[2] || "log", "#f8fafc")}`;
  } else if (["iala"].includes(profile.diagram)) {
    body = `<rect x="64" y="112" width="350" height="220" rx="16" fill="#ecfdf5" stroke="#86efac"/>
      <text x="88" y="148" font-size="18" font-weight="800" fill="#166534">Region A</text>
      <circle cx="130" cy="215" r="36" fill="#16a34a"/><text x="105" y="220" font-size="13" font-weight="800" fill="#fff">Starboard</text>
      <rect x="245" y="178" width="72" height="72" rx="10" fill="#dc2626"/><text x="260" y="220" font-size="13" font-weight="800" fill="#fff">Port</text>
      <rect x="506" y="112" width="350" height="220" rx="16" fill="#eff6ff" stroke="#93c5fd"/>
      <text x="530" y="148" font-size="18" font-weight="800" fill="#1d4ed8">Region B</text>
      <circle cx="572" cy="215" r="36" fill="#dc2626"/><text x="550" y="220" font-size="13" font-weight="800" fill="#fff">Starboard</text>
      <rect x="690" y="178" width="72" height="72" rx="10" fill="#16a34a"/><text x="714" y="220" font-size="13" font-weight="800" fill="#fff">Port</text>
      <text x="96" y="302" font-size="13" fill="#334155">Đối chiếu với hải đồ, hướng luồng và màu/nhịp đèn.</text>
      <text x="538" y="302" font-size="13" fill="#334155">Không suy luận màu phao nếu chưa xác định vùng.</text>`;
  } else {
    const labels = [concepts[0], concepts[1], concepts[2], concepts[3] || evidence[0], evidence[1] || evidence[0]].filter(Boolean);
    body = `${card(56, 138, 160, 74, labels[0] || "Chuẩn", "#f8fafc")}
      ${arrow(216, 175, 300, 175)}
      ${card(300, 138, 160, 74, labels[1] || "Dữ liệu", "#ffffff")}
      ${arrow(460, 175, 544, 175)}
      ${card(544, 138, 160, 74, labels[2] || "Kiểm chứng", "#f8fafc")}
      ${arrow(704, 175, 788, 175)}
      ${card(788, 138, 160, 74, labels[3] || "Quyết định", "#ffffff")}
      <rect x="156" y="276" width="650" height="70" rx="16" fill="#fff7ed" stroke="#fed7aa"/>
      <text x="184" y="307" font-size="15" font-weight="800" fill="#9a3412">Bằng chứng bắt buộc</text>
      <text x="184" y="331" font-size="14" fill="#7c2d12">${evidence.join("  |  ")}</text>`;
  }

  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="430" viewBox="0 0 1000 430">
    <defs>
      <style>text{font-family:${svgFontStack};letter-spacing:0;font-kerning:normal}</style>
      <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="${primary}"/></marker>
    </defs>
    <rect width="1000" height="430" rx="28" fill="#f8fafc"/>
    <rect x="28" y="28" width="944" height="374" rx="24" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="56" y="70" font-family="${svgFontStack}" font-size="24" font-weight="800" fill="${ink}">${title}</text>
    <text x="56" y="98" font-family="${svgFontStack}" font-size="14" fill="#475569">${subtitle}</text>
    ${body}
    <text x="56" y="388" font-family="${svgFontStack}" font-size="12" fill="#64748b">Sơ đồ học tập diễn giải từ chuẩn nguồn; dùng để học và đối chiếu, không thay thế văn bản pháp quy.</text>
  </svg>`);
}

function buildKnowledgeSection(course, profile, chapterTitle) {
  const fig = diagramSvg(course, profile, "knowledge");
  const sourceKeys = profile.sourceKeys;
  const [c0, c1, c2, c3] = profile.concepts;
  const [e0, e1, e2, e3] = profile.evidence;
  return {
    type: "TEXT",
    title: `Chuyên đề: ${profile.title}`,
    orderIndex: 0,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
    content: `<figure><img src="${fig}" alt="Sơ đồ ${esc(profile.diagramTitle)}" /><figcaption>${esc(profile.diagramTitle)} được sơ đồ hóa từ nguồn chuẩn quốc tế liên quan; mọi ví dụ hoặc dữ liệu trong lớp phải có nguồn kiểm chứng.</figcaption></figure>
<p><strong>${esc(profile.title)}</strong> là nội dung của chương <strong>${esc(chapterTitle)}</strong>. Trọng tâm chuyên môn là: <strong>${esc(profile.standardFocus)}</strong>. Phần này không tự tạo dữ liệu minh họa không có nguồn; học viên cần đối chiếu với dữ liệu thật từ tàu, cảng, công ty, lớp học hoặc tài liệu chính thức mà giảng viên cung cấp.</p>
<p>Điểm khác biệt của bài này so với học liệu nhập môn là học viên phải hiểu <strong>cơ chế nghiệp vụ</strong>, không chỉ thuộc thuật ngữ. Với <strong>${esc(c0)}</strong>, người học cần xác định được phạm vi áp dụng, dữ liệu đầu vào, rủi ro nếu hiểu sai và bằng chứng tối thiểu. Với <strong>${esc(c1)}</strong>, trọng tâm là kiểm chứng chéo: nguồn nào là nguồn phát sinh, nguồn nào là nguồn xác nhận và nguồn nào chỉ hỗ trợ nhận thức tình huống. Với <strong>${esc(c2)}</strong>, học viên phải mô tả được giới hạn kỹ thuật hoặc giới hạn pháp lý trước khi ra quyết định.</p>
<p>Các chuẩn quốc tế như IMO, IALA, IHO hoặc ICC thường không yêu cầu học viên ghi nhớ từng câu chữ trong môi trường học trực tuyến, nhưng yêu cầu tư duy đúng: biết nguồn nào có thẩm quyền, biết giới hạn của nguồn đó và biết cách chuyển yêu cầu thành hành động vận hành. Vì vậy, bài học này luôn gắn kiến thức với hồ sơ: <strong>${esc(e0)}</strong>, <strong>${esc(e1)}</strong>, <strong>${esc(e2)}</strong>${e3 ? ` và <strong>${esc(e3)}</strong>` : ""}.</p>
<h4>Khái niệm lõi và ý nghĩa nghiệp vụ</h4>
<table>
  <thead><tr><th>Khái niệm</th><th>Ý nghĩa chuyên môn</th><th>Bằng chứng phải kiểm tra</th><th>Lỗi nghiệp vụ cần tránh</th></tr></thead>
  <tbody>
    <tr><td>${esc(c0)}</td><td>Đặt ranh giới của quyết định và cho biết ai chịu trách nhiệm xác nhận.</td><td>${esc(e0)}</td><td>Nhầm lẫn giữa thông tin tham khảo và bằng chứng có thể truy vết.</td></tr>
    <tr><td>${esc(c1)}</td><td>Tạo lớp kiểm chứng độc lập để giảm phụ thuộc vào một người, một màn hình hoặc một chứng từ.</td><td>${esc(e1)}</td><td>Chỉ sao chép dữ liệu mà không ghi nguồn, thời điểm và người xác nhận.</td></tr>
    <tr><td>${esc(c2)}</td><td>Chuyển yêu cầu chuẩn thành tiêu chí kiểm soát trước, trong và sau thao tác.</td><td>${esc(e2)}</td><td>Đóng công việc khi còn điều kiện mở hoặc cảnh báo chưa được bàn giao.</td></tr>
    <tr><td>${esc(c3 || "hồ sơ năng lực")}</td><td>Cho phép giảng viên hoặc người kiểm tra đánh giá năng lực bằng bằng chứng thay vì cảm tính.</td><td>${esc(e3 || e0)}</td><td>Viết nhận xét chung chung như "đã kiểm tra" mà không có dấu vết kiểm tra.</td></tr>
  </tbody>
</table>
<h4>Giới hạn áp dụng</h4>
<p>Nội dung trong LMS là học liệu chuyên môn, không thay thế công ước, luật quốc gia, SMS của công ty, hướng dẫn cảng, standing orders của thuyền trưởng hoặc hợp đồng thương mại. Khi học viên sử dụng bài này cho thực tế, phải đối chiếu phiên bản tài liệu đang có hiệu lực và quy định nội bộ. Nếu dữ liệu thật không đủ, câu trả lời đúng là ghi rõ thiếu dữ liệu nào, ảnh hưởng ra sao và ai cần cung cấp, thay vì tự điền số liệu.</p>
<h4>Nguồn chính thức để đối chiếu</h4>
<ul>${sourceList(sourceKeys)}</ul>`,
  };
}

function buildApplicationSection(course, profile) {
  const fig = diagramSvg(course, { ...profile, diagramTitle: `${profile.diagramTitle}: quy trình áp dụng` }, "practice");
  const [e0, e1, e2, e3] = profile.evidence;
  const [c0, c1, c2, c3] = profile.concepts;
  return {
    type: "TEXT",
    title: `Áp dụng nghiệp vụ: ${profile.diagramTitle}`,
    orderIndex: 1,
    duration: 0,
    isRequired: true,
    completionThreshold: 100,
    content: `<figure><img src="${fig}" alt="Quy trình áp dụng ${esc(profile.diagramTitle)}" /><figcaption>Quy trình học tập dựa trên chuẩn nguồn và hồ sơ thật; học viên chỉ nhập dữ liệu có nguồn hoặc được giảng viên cung cấp.</figcaption></figure>
<p>Mục này biến chuyên đề <strong>${esc(profile.title)}</strong> thành thao tác có thể kiểm tra. Học viên không cần tự bịa bối cảnh hoặc dữ liệu. Thay vào đó, hãy dùng một bộ hồ sơ thật đã được phép sử dụng trong lớp: nhật ký ca, checklist, form trống của công ty, tài liệu cảng, route plan, B/L draft, VGM declaration, EIR, hoặc tài liệu tương đương do giảng viên cung cấp.</p>
<h4>Quy trình áp dụng</h4>
<table>
  <thead><tr><th>Bước</th><th>Việc cần làm</th><th>Câu hỏi kiểm soát</th><th>Hồ sơ đầu ra</th></tr></thead>
  <tbody>
    <tr><td>1. Xác định phạm vi</td><td>Nêu rõ bài đang áp dụng cho tàu/cảng/chứng từ/ca trực/hệ thống nào.</td><td>Phạm vi này có đúng với ${esc(profile.standardFocus)} không?</td><td>Ghi chú phạm vi và nguồn tài liệu.</td></tr>
    <tr><td>2. Kiểm tra dữ liệu</td><td>Đọc và đối chiếu ${esc(e0)}, ${esc(e1)}.</td><td>Dữ liệu có nguồn, thời điểm, người xác nhận và phiên bản không?</td><td>Bảng kiểm chứng dữ liệu.</td></tr>
    <tr><td>3. Đánh giá rủi ro/sai lệch</td><td>So sánh dữ liệu với ${esc(c0)}, ${esc(c1)} và ${esc(c2)}.</td><td>Sai lệch nào ảnh hưởng an toàn, pháp lý, chi phí hoặc lịch khai thác?</td><td>Danh sách sai lệch có mức ưu tiên.</td></tr>
    <tr><td>4. Chọn hành động</td><td>Đề xuất hành động phù hợp với quyền hạn và chuẩn nguồn.</td><td>Ai có quyền quyết định, ai phải được thông báo, điều kiện tiếp tục là gì?</td><td>Action log hoặc handover note.</td></tr>
    <tr><td>5. Lưu bằng chứng</td><td>Gắn kết quả với ${esc(e2)}${e3 ? ` và ${esc(e3)}` : ""}.</td><td>Người khác có thể kiểm tra lại quyết định sau ca/hồ sơ không?</td><td>Portfolio bài học hoặc Word form đã điền.</td></tr>
  </tbody>
</table>
<h4>Bài thực hành dùng dữ liệu thật</h4>
<ol>
  <li>Chọn một tài liệu thật hoặc form trống thật liên quan đến bài học. Nếu tài liệu có dữ liệu nhạy cảm, phải ẩn tên tàu, số chuyến, tên khách hàng, số container, tọa độ hoặc thông tin định danh.</li>
  <li>Điền bảng kiểm chứng: nguồn dữ liệu, thời điểm, người/bộ phận sở hữu dữ liệu, giới hạn sử dụng.</li>
  <li>Đánh dấu ít nhất ba điểm có thể gây sai lệch nghiệp vụ. Các điểm này phải gắn với ${esc(c0)}, ${esc(c1)} hoặc ${esc(c2)}.</li>
  <li>Viết một quyết định hoặc khuyến nghị ngắn, nêu rõ điều kiện để tiếp tục công việc và bằng chứng phải lưu.</li>
  <li>Đính kèm hoặc ghi tên hồ sơ đầu ra: ${esc(e0)}, ${esc(e1)}, ${esc(e2)}${e3 ? `, ${esc(e3)}` : ""}.</li>
</ol>
<h4>Câu hỏi kiểm tra chuyên sâu</h4>
<ul>
  <li>Nguồn nào trong bài có thẩm quyền cao nhất, và nguồn đó có giới hạn gì?</li>
  <li>Nếu ${esc(e0)} và ${esc(e1)} mâu thuẫn, bạn kiểm chứng bằng nguồn nào trước?</li>
  <li>Dữ liệu nào bắt buộc phải bàn giao để người tiếp theo không mất nhận thức tình huống?</li>
  <li>Câu trả lời của bạn có thể bị kiểm tra lại bằng hồ sơ nào?</li>
</ul>
<p>Chuẩn hoàn thành section này là học viên tạo được một sản phẩm học tập có thể kiểm tra, không phải một đoạn văn mô tả chung chung. Sản phẩm phải dựa trên nguồn chuẩn, dữ liệu thật được phép dùng và bằng chứng rõ ràng.</p>`,
  };
}

function wordHtml(course, profile, chapterTitle) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Montserrat,'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.45} h1{font-size:20px} h2{font-size:16px;margin-top:18px}
table{border-collapse:collapse;width:100%;margin:10px 0 16px} th,td{border:1px solid #9ca3af;padding:8px;vertical-align:top} th{background:#e5eef9}
</style></head><body>
<h1>Biểu mẫu thực hành: ${esc(profile.title)}</h1>
<p><strong>Khóa:</strong> ${esc(course.title)}</p><p><strong>Chương:</strong> ${esc(chapterTitle)}</p>
<p><strong>Trọng tâm:</strong> ${esc(profile.standardFocus)}</p>
<h2>1. Nguồn dữ liệu thật được sử dụng</h2>
<table><tr><th>Tài liệu/hồ sơ</th><th>Nguồn</th><th>Thời điểm/phiên bản</th><th>Thông tin đã ẩn danh</th></tr>
${profile.evidence.map((e) => `<tr><td>${esc(e)}</td><td></td><td></td><td></td></tr>`).join("")}</table>
<h2>2. Kiểm chứng theo chuẩn</h2>
<table><tr><th>Khái niệm</th><th>Dấu hiệu cần kiểm tra</th><th>Sai lệch phát hiện</th><th>Hành động đề xuất</th></tr>
${profile.concepts.map((c) => `<tr><td>${esc(c)}</td><td></td><td></td><td></td></tr>`).join("")}</table>
<h2>3. Quyết định và bằng chứng</h2>
<table><tr><th>Khuyến nghị/Quyết định</th><td></td></tr><tr><th>Người/bộ phận cần xác nhận</th><td></td></tr><tr><th>Điều kiện tiếp tục công việc</th><td></td></tr><tr><th>Hồ sơ lưu lại</th><td></td></tr></table>
<p>Không tự điền dữ liệu không có nguồn. Nếu thiếu dữ liệu, ghi rõ dữ liệu thiếu, nguồn cần bổ sung và ảnh hưởng của việc thiếu dữ liệu.</p>
</body></html>`;
}

function fileFromHtml(fileName, html) {
  return { fileName, blob: new Blob([html], { type: "application/msword;charset=utf-8" }) };
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function videoPayload(course, profile, sequence, existing = {}) {
  const video = courseVideo(course, sequence);
  return {
    type: "VIDEO",
    title: `Video riêng: ${video[1]}`,
    content: `Video phục vụ riêng cho bài "${profile.title}". Không chèn link video vào section text.`,
    videoUrl: `https://www.youtube.com/watch?v=${video[0]}`,
    videoType: "YOUTUBE",
    orderIndex: 2,
    duration: existing.duration || 10,
    isRequired: false,
    completionThreshold: existing.completionThreshold || 80,
  };
}

function courseVideo(course, sequence) {
  const video = course.lessons[sequence]?.video || course.videos?.[sequence];
  if (!video) throw new Error(`${course.code} lesson ${sequence + 1} is missing a unique video`);
  return video;
}

function assertUniqueVideoPlan(courseList) {
  const globalIds = new Map();
  for (const course of courseList) {
    const planned = course.lessons.map((_, index) => courseVideo(course, index));
    if (planned.length !== course.lessons.length) {
      throw new Error(`${course.code} video plan must cover every lesson`);
    }
    const localIds = new Map();
    for (let index = 0; index < planned.length; index += 1) {
      const [id, title] = planned[index] || [];
      if (!id || !title) throw new Error(`${course.code} lesson ${index + 1} is missing a planned video id/title`);
      if (localIds.has(id)) {
        throw new Error(`${course.code} duplicates YouTube video ${id} in lessons ${localIds.get(id) + 1} and ${index + 1}`);
      }
      if (globalIds.has(id)) {
        throw new Error(`${course.code} reuses YouTube video ${id}; already used by ${globalIds.get(id)}`);
      }
      localIds.set(id, index);
      globalIds.set(id, `${course.code} lesson ${index + 1}`);
    }
  }
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

async function sendSection(method, lessonId, sectionId, token, payload, file) {
  const form = new FormData();
  form.append("data", new Blob([JSON.stringify(payload)], { type: "application/json; charset=utf-8" }), "section.json");
  if (file) form.append("file", file.blob, file.fileName);
  const path = sectionId ? `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}` : `/api/v3/courses/lessons/${lessonId}/sections`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function updateLesson(courseId, chapterId, lesson, profile, token) {
  await api("PUT", `/api/v3/courses/lessons/${lesson.id}`, token, {
    courseId,
    chapterId,
    title: profile.title,
    description: profile.standardFocus,
    lessonType: lesson.lessonType || lesson.type || "TEXT",
    content: lesson.content || null,
    videoUrl: lesson.videoUrl || null,
    durationMinutes: Math.max(lesson.durationMinutes || 20, 35),
    isRequired: true,
    isPreview: lesson.isPreview || false,
  });
}

function count(chapters) {
  const lessons = chapters.flatMap((chapter) => chapter.lessons || []);
  const sections = lessons.flatMap((lesson) => lesson.sections || []);
  const text = sections.filter((section) => section.type === "TEXT");
  const videos = sections.filter((section) => section.type === "VIDEO");
  const videoUrls = videos.map((section) => section.videoUrl).filter(Boolean);
  const duplicateVideoUrls = videoUrls.length - new Set(videoUrls).size;
  return {
    chapters: chapters.length,
    lessons: lessons.length,
    sections: sections.length,
    text: text.length,
    video: videos.length,
    duplicateVideoUrls,
    file: sections.filter((section) => section.type === "FILE").length,
    maxSectionsPerLesson: Math.max(...lessons.map((lesson) => (lesson.sections || []).length)),
    avgTextLength: text.length ? Math.round(text.reduce((sum, section) => sum + (section.content || "").length, 0) / text.length) : 0,
    dataSvgImages: text.filter((section) => /data:image\/svg\+xml/i.test(section.content || "")).length,
    fakeLanguage: text.filter((section) => /giả sử|tình huống giả|kịch bản giả|số liệu giả|dữ liệu giả/i.test(section.content || "")).length,
    textWithYoutube: text.filter((section) => /youtube\.com|youtu\.be/i.test(section.content || "")).length,
  };
}

console.log(`Logging in to ${baseUrl}...`);
assertUniqueVideoPlan(courses);
const teacherToken = await login(args.get("--teacher-email"), args.get("--teacher-password"));
const adminToken = await login(args.get("--admin-email"), args.get("--admin-password"));
const studentToken = args.get("--student-email") && args.get("--student-password")
  ? await login(args.get("--student-email"), args.get("--student-password"))
  : null;
const categories = (await api("GET", "/api/v3/categories", teacherToken)).data || [];
const categoryByCode = new Map(categories.map((category) => [category.code, category.id]));
const summary = [];

for (const course of courses) {
  console.log(`Specializing course content: ${course.title}`);
  await api("PUT", `/api/v3/courses/${course.id}`, teacherToken, {
    title: course.title,
    description: course.description,
    thumbnailUrl: `https://i.ytimg.com/vi/${courseVideo(course, 0)[0]}/hqdefault.jpg`,
    categoryId: categoryByCode.get(course.code),
    tags: [course.code, "IMO", "STCW", "IALA", "IHO", "FAL", "Nguồn kiểm chứng"],
    welcomeMessage:
      "Nội dung đã được chuyên biệt theo từng nghiệp vụ. Học viên học bằng nguồn chuẩn, sơ đồ minh họa và dữ liệu thật được phép sử dụng; mọi ví dụ hoặc dữ liệu trong lớp phải có nguồn kiểm chứng.",
    courseInformation:
      "Mỗi bài có 5 section: 2 text section chuyên sâu riêng cho bài, 1 video riêng, 1 PDF chính thức và 1 Word form thực hành. Hai text section có sơ đồ SVG chèn trực tiếp trong bài.",
    benefits:
      "Học viên xây dựng năng lực bằng hồ sơ có thể kiểm tra: đối chiếu nguồn chuẩn, nhận diện dữ liệu, đánh giá sai lệch, ra quyết định và lưu bằng chứng.",
    credits: 4,
    visibility: "PUBLIC",
    priceType: "FREE",
    price: 0,
    salePrice: null,
    deliveryMode: "SELF_PACED",
    allowOfflineDownload: true,
  });

  const draft = (await api("GET", `/api/v3/teacher/courses/${course.id}/draft/content`, teacherToken)).data || [];
  let sequence = 0;
  let updatedLessons = 0;
  let updatedSections = 0;
  let updatedWords = 0;

  for (const chapter of draft) {
    const chapterTitle = clean(chapter.title);
    for (const lesson of chapter.lessons || []) {
      const profile = course.lessons[sequence];
      if (!profile) throw new Error(`Missing profile for ${course.code} lesson ${sequence + 1}`);
      const sections = [...(lesson.sections || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const textSections = sections.filter((section) => section.type === "TEXT");
      const videoSection = sections.find((section) => section.type === "VIDEO");
      const fileSections = sections.filter((section) => section.type === "FILE");
      const pdfSection = fileSections.find((section) => /\.pdf(?:[?#]|$)/i.test(section.fileUrl || ""));
      const wordSection = fileSections.find((section) => /\.(doc|docx)(?:[?#]|$)/i.test(section.fileUrl || ""));
      if (textSections.length < 2 || !videoSection || !pdfSection || !wordSection) {
        throw new Error(`Lesson ${lesson.id} does not have expected 2 text + video + PDF + Word sections`);
      }

      await updateLesson(course.id, chapter.id, lesson, profile, teacherToken);
      await sendSection("PUT", lesson.id, textSections[0].id, teacherToken, buildKnowledgeSection(course, profile, chapterTitle));
      await sendSection("PUT", lesson.id, textSections[1].id, teacherToken, buildApplicationSection(course, profile));
      await sendSection("PUT", lesson.id, videoSection.id, teacherToken, videoPayload(course, profile, sequence, videoSection));
      await sendSection("PUT", lesson.id, pdfSection.id, teacherToken, {
        type: "FILE",
        title: pdfSection.title,
        content: `PDF chính thức để đối chiếu bài "${profile.title}". Học viên dùng tài liệu này như nguồn chuẩn, không tự suy diễn ngoài phạm vi văn bản.`,
        fileUrl: pdfSection.fileUrl,
        fileName: pdfSection.fileName,
        previewPdfUrl: pdfSection.previewPdfUrl,
        previewStatus: pdfSection.previewStatus,
        orderIndex: 3,
        duration: 0,
        isRequired: true,
        completionThreshold: 100,
      });
      await sendSection(
        "PUT",
        lesson.id,
        wordSection.id,
        teacherToken,
        {
          type: "FILE",
          title: `Word thực hành bằng dữ liệu thật: ${profile.title}`,
          content: "Biểu mẫu yêu cầu học viên dùng hồ sơ thật được phép sử dụng hoặc form trống thật; không điền dữ liệu không có nguồn.",
          orderIndex: 4,
          duration: 0,
          isRequired: true,
          completionThreshold: 100,
        },
        fileFromHtml(`${course.code.toLowerCase()}-${String(sequence + 1).padStart(2, "0")}-${slug(profile.title)}.doc`, wordHtml(course, profile, chapterTitle)),
      );

      updatedLessons += 1;
      updatedSections += 4;
      updatedWords += 1;
      sequence += 1;
    }
  }

  await api("POST", `/api/v3/teacher/courses/${course.id}/submit-for-approval`, teacherToken, {
    releaseNotes:
      "Chuyên biệt hóa từng bài học theo chuẩn hàng hải quốc tế, thay nội dung chung bằng kiến thức nghiệp vụ riêng, thêm sơ đồ SVG trong text và yêu cầu dùng dữ liệu thật.",
  });
  await api("PATCH", `/api/v3/admin/courses/${course.id}/approve`, adminToken, {
    comment:
      "Đã duyệt bản cập nhật chuyên sâu: nội dung dùng nguồn kiểm chứng, mỗi bài có sơ đồ minh họa, nguồn chuẩn và bài thực hành bằng hồ sơ thật.",
  });

  const published = (await api("GET", `/api/v3/courses/${course.id}/content`, studentToken || teacherToken)).data || [];
  summary.push({ title: course.title, updatedLessons, updatedSections, updatedWords, published: count(published) });
}

console.log(JSON.stringify(summary, null, 2));

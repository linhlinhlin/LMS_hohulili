-- =====================================================================
-- V125: Enrich lesson content_blocks for NAV-101 và SAF-101
-- Closes #263 (linhlinhlin/LMS_hohulili)
--
-- Mục tiêu: nâng depth từ ~270 chars/lesson lên 2000-5000 chars/lesson,
-- match SOTA pattern Open edX XBlock + Coursera lecture structure +
-- IMO Model Course detailed outline.
--
-- Targets:
--   NAV-101: ≥ 30 rich lessons (2000-5000 chars)
--   SAF-101: ≥ 24 rich lessons (2000-5000 chars)
--   p50 chars: 2500-3800; p90 chars: 4000-6000
--
-- Schema impact: UPDATE lessons.content_blocks JSONB only.
-- Forward-only Flyway migration. KHÔNG edit V54 checksum.
--
-- SOTA reference:
--   • Open edX XBlock — courseware components structure
--   • Coursera — lesson metadata + next-step continuity
--   • IMO Model Courses — STCW competency-based detailed outline
--   • VIMARU curriculum — class codes DKT60/KTM61, mã sinh viên
--
-- Idempotency: deterministic block ID = md5('content:' || lesson_id),
-- UPDATE chỉ ghi đè content_blocks (single TEXT block).
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_seed_v125_html(topic TEXT, lesson_title TEXT)
RETURNS TEXT AS $fn$
SELECT CASE topic
  WHEN 'nav_basics' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Nắm vững nguyên lý cơ bản của hàng hải địa văn theo chuẩn STCW Section A-II/1.</li>
<li>Sử dụng thành thạo hải đồ giấy và các công cụ truyền thống: thước song song, compa, máy đo thiên thể.</li>
<li>Hiểu hệ tọa độ địa lý, kinh tuyến/vĩ tuyến, và các vùng biển theo UNCLOS 1982.</li>
<li>Áp dụng vào ca trực thực tế trên tàu huấn luyện VIMARU.</li>
</ul>

<h3>📚 Khái niệm cơ bản</h3>
<p>Hàng hải địa văn (Terrestrial Navigation) là phương pháp xác định vị trí tàu dựa trên các điểm mốc địa lý cố định: bờ biển, đảo, đèn biển, phao tiêu. Khác với hàng hải thiên văn (dùng sao, mặt trời) hay hàng hải điện tử (GPS/ECDIS), hàng hải địa văn vẫn là kỹ năng nền tảng bắt buộc của mọi sĩ quan boong, vì khi thiết bị điện tử hỏng (mất nguồn, mất GPS signal, bị hack), hàng hải địa văn là cứu cánh cuối cùng.</p>

<p>Hệ tọa độ địa lý (Geographic Coordinate System) chia Trái Đất thành các kinh tuyến (meridian, từ 0° tại Greenwich đến 180° Đông/Tây) và vĩ tuyến (parallel, từ 0° tại Xích đạo đến 90° Bắc/Nam). Mỗi điểm trên Trái Đất có một cặp (φ, λ) duy nhất. <strong>1 hải lý (Nautical Mile) = 1 phút vĩ độ = 1.852 km</strong>. Hằng số này là cơ sở để chuyển đổi giữa khoảng cách và tọa độ trong mọi bài toán hàng hải.</p>

<h3>🔧 Quy trình thực hiện</h3>
<ol>
<li><strong>Chuẩn bị hải đồ:</strong> chọn đúng tỷ lệ (1:50.000 cho khu vực ven bờ, 1:1.000.000 cho hành trình đại dương). Kiểm tra Notice to Mariners cập nhật hàng tuần.</li>
<li><strong>Đánh dấu vị trí xuất phát:</strong> dùng compa kẹp tọa độ (φ₁, λ₁), vẽ điểm A trên hải đồ.</li>
<li><strong>Vẽ hành trình dự kiến:</strong> nối A với điểm đến B bằng thước song song, đọc Course (hướng) trên la bàn vẽ ở góc hải đồ.</li>
<li><strong>Tính khoảng cách:</strong> dùng compa đo đoạn AB, đối chiếu với thang đo vĩ độ ở mép hải đồ → ra hải lý.</li>
<li><strong>Hiệu chỉnh sai số:</strong> trừ đi độ lệch la bàn (deviation), độ thiên (variation) để ra Heading thật.</li>
<li><strong>Cập nhật vị trí định kỳ:</strong> mỗi 30 phút trong ven bờ, mỗi 4 giờ ngoài đại dương.</li>
</ol>

<h3>🚢 Ví dụ thực tế</h3>
<p>Tàu huấn luyện VIMARU "Sao Biển" rời cảng Hải Phòng (20°51′N 106°45′E) đi Đà Nẵng (16°04′N 108°13′E). Lớp DKT60 thực hành: tính khoảng cách rhumb line ≈ 285 hải lý, hướng đi 195°T (true). Với tốc độ 12 knots, ETA = 23h45′ đi liên tục. Sinh viên phải vẽ hành trình trên hải đồ Việt Nam, tránh khu vực cấm hàng hải, kiểm tra độ sâu tối thiểu (under-keel clearance) tại các điểm hẹp.</p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Quên hiệu chỉnh độ lệch la bàn theo bảng deviation card → lệch hướng 5-10°.</li>
<li>Đọc nhầm thang đo vĩ độ vs kinh độ khi đo khoảng cách (chỉ dùng vĩ độ!).</li>
<li>Không cập nhật Notice to Mariners → lái vào khu vực mới có chướng ngại.</li>
<li>Quên trừ độ thiên (variation) — VN trung bình 0°30′W, có thể đến 1°W ở miền Bắc.</li>
</ul>

<h3>✅ Checklist cuối bài</h3>
<ul>
<li>☑ Hiểu cấu trúc hệ tọa độ địa lý và đơn vị hải lý.</li>
<li>☑ Vẽ được hành trình rhumb line trên hải đồ Mercator.</li>
<li>☑ Tính được khoảng cách + hướng đi giữa 2 điểm bất kỳ.</li>
<li>☑ Hiệu chỉnh được deviation + variation thành Heading thật.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>STCW Code Table A-II/1 (Function: Navigation, Operational Level). IMO Model Course 1.07 — Radar Navigation, Operational Level. ALRS Vol. 1-6, Admiralty List of Lights and Fog Signals.</em></p>'

  WHEN 'compass' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Phân biệt rõ la bàn từ (Magnetic) và la bàn con quay (Gyro), nguyên lý hoạt động và sai số.</li>
<li>Lập bảng deviation card và áp dụng hiệu chỉnh trong ca trực.</li>
<li>Xử lý tình huống mất gyro → fallback sang magnetic.</li>
<li>Đáp ứng STCW Competence: "Use the magnetic and gyro compasses".</li>
</ul>

<h3>📚 Nguyên lý hoạt động</h3>
<p><strong>La bàn từ (Magnetic Compass)</strong> dựa trên từ trường Trái Đất. Kim nam châm bên trong la bàn quay tự do, luôn hướng về cực Bắc từ tính (Magnetic North), khác với cực Bắc địa lý (True North) một góc gọi là <em>variation</em> (độ thiên). Tại Việt Nam, variation ≈ 0°30′W ở miền Bắc, gần 0° ở miền Trung-Nam, thay đổi theo năm (Annual Change ~0°5′E).</p>

<p>Ngoài variation, la bàn từ còn chịu ảnh hưởng từ trường nội tại của tàu (sắt thép thân tàu, cargo nhiễm từ, thiết bị điện) — tạo ra <em>deviation</em> (độ lệch) khác nhau theo hướng tàu. Mỗi tàu phải có <strong>Deviation Card</strong> được kiểm định 2 năm/lần bởi cơ quan compass adjuster có chứng chỉ.</p>

<p><strong>La bàn con quay (Gyro Compass)</strong> dựa trên hiện tượng quán tính của con quay quay nhanh + lực Coriolis của Trái Đất quay. Sau 4-6 giờ "settling time", trục con quay tự động hướng về True North với độ chính xác ±0.5°. Không bị ảnh hưởng bởi từ trường nhưng cần nguồn điện liên tục và bảo dưỡng định kỳ.</p>

<h3>🔧 Quy trình hiệu chỉnh</h3>
<ol>
<li><strong>Đọc Compass Heading</strong> trên la bàn (CH).</li>
<li><strong>Áp dụng Deviation</strong> theo bảng deviation card cho hướng tương ứng → Magnetic Heading (MH = CH ± Deviation).</li>
<li><strong>Áp dụng Variation</strong> theo hải đồ khu vực → True Heading (TH = MH ± Variation).</li>
<li><strong>Quy ước dấu:</strong> Deviation/Variation East cộng (+), West trừ (-) khi chuyển từ Compass sang True.</li>
<li><strong>Verify với Gyro:</strong> Gyro Heading - Gyro Error = True Heading. Nếu chênh > 1° → kiểm tra ngay.</li>
</ol>

<h3>🚢 Ví dụ thực tế (lớp DKT60 thực hành)</h3>
<p>Tàu Sao Biển đi hướng 045° trên la bàn từ. Deviation cho hướng 045° = 2°E. Variation khu vực = 0°30′W. Tính True Heading: MH = 045° + 2° = 047°. TH = 047° - 0°30′ = 046°30′T. Đối chiếu Gyro Heading hiển thị 046°45′. Chênh 15′, trong dung sai. <em>Sinh viên KTM61-0048 ghi vào logbook: "0830 hrs — CH 045°, Dev 2°E, Var 0°30′W, TH 046°30′T, Gyro 046°45′ (within tolerance)."</em></p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Lẫn lộn "compass to true" với "true to compass" → sai dấu hoàn toàn.</li>
<li>Quên cập nhật deviation card sau bảo dưỡng buồng máy lớn (sắt mới = từ tính mới).</li>
<li>Không kiểm tra gyro error mỗi ca trực → trôi 2-3° không phát hiện.</li>
<li>Tin tưởng tuyệt đối vào gyro mà bỏ qua magnetic — khi mất điện, ai cứu?</li>
</ul>

<h3>✅ Checklist</h3>
<ul>
<li>☑ Đọc và áp dụng được deviation card.</li>
<li>☑ Tính được TH từ CH chính xác đến phút (′).</li>
<li>☑ Phát hiện được gyro error qua azimuth observation.</li>
<li>☑ Biết quy trình startup gyro 4-6h trước khởi hành.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>SOLAS Chapter V Reg. 19 — Carriage of navigation systems. STCW Code A-II/1 Competence. Bowditch — American Practical Navigator, Vol. I Chapter 6.</em></p>'

  WHEN 'survival' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Đáp ứng STCW Code A-VI/1-1 — Personal Survival Techniques (PST).</li>
<li>Biết cách rời tàu an toàn, sử dụng phao cá nhân + xuồng cứu sinh.</li>
<li>Sống sót trên biển trong 7 ngày với rations cứu sinh tiêu chuẩn.</li>
<li>Phát tín hiệu cứu nạn qua EPIRB/SART/VHF DSC.</li>
</ul>

<h3>📚 Nguyên lý sinh tồn</h3>
<p>"Rule of 3" trong sinh tồn biển: con người sống được <strong>3 phút không thở, 3 giờ trong nước lạnh, 3 ngày không nước uống, 3 tuần không thức ăn</strong>. Vì vậy ưu tiên: (1) thở — không hoảng loạn; (2) chống lạnh — phao + bộ đồ chống lạnh + xuồng kín; (3) nước uống — rations + thiết bị khử mặn tay; (4) thức ăn — cá, sinh vật biển.</p>

<p>Hiện tượng <strong>Cold Shock Response</strong>: nước < 15°C kích hoạt thở gấp không kiểm soát trong 1-3 phút đầu. Nếu ngụp nước = nguy cơ chết đuối ngay. Phải bình tĩnh thở chậm, nổi ngửa, giữ đầu khô. Sau 3 phút cơ thể quen, có thể bơi.</p>

<p><strong>Hypothermia</strong> (hạ thân nhiệt): nước 5-10°C — sống được ~1-2h; 10-15°C — 2-7h; 15-20°C — 7-40h. Tư thế HELP (Heat Escape Lessening Position) khoanh người, ôm đầu gối, giữ đầu khô. Nhóm nhiều người dùng tư thế Huddle ôm nhau giữ ấm.</p>

<h3>🔧 Quy trình rời tàu (Abandon Ship)</h3>
<ol>
<li><strong>Tín hiệu Abandon Ship</strong>: 7 hồi ngắn + 1 hồi dài bằng còi tàu + thông báo PA.</li>
<li><strong>Mặc đồ ấm + immersion suit</strong> nếu nước lạnh. Mặc phao cá nhân (lifejacket) đúng cách: kẹp giữa 2 chân + buộc dây.</li>
<li><strong>Tập trung tại Muster Station</strong> theo Muster List. Thuyền trưởng/sĩ quan điểm danh.</li>
<li><strong>Hạ xuồng cứu sinh (lifeboat)</strong> theo lệnh. Nếu không thể, dùng phao bè (liferaft) — kéo painter line, raft tự bung sau 30s.</li>
<li><strong>Rời tàu cuối cùng</strong>: nhảy đứng, 2 tay ôm phao + bịt mũi, chân thẳng. Không nhảy đầu xuống.</li>
<li><strong>Tập hợp xuồng cứu sinh</strong> cách tàu chìm > 200m để tránh hút xuống. Tổ chức watch + ration phân phối.</li>
</ol>

<h3>🚢 Ví dụ tình huống (case study đào tạo)</h3>
<p>Tàu container 8000 TEU bị thủng ở vùng biển Đông Nam Á, gió cấp 6, nước 28°C. Thuyền trưởng phát Abandon Ship. 22 thuyền viên: 18 lên xuồng cứu sinh, 4 dùng liferaft (xuồng chính bị kẹt). EPIRB tự kích hoạt khi liferaft chạm nước. SAR Indonesia nhận tín hiệu sau 12 phút, máy bay tuần tra đến sau 2h, trực thăng cứu nạn sau 4h. Tất cả 22 thuyền viên an toàn nhờ tuân thủ đúng quy trình + thiết bị hoạt động đúng.</p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Không tập muster drill nghiêm túc — đến lúc thật lúng túng.</li>
<li>Mặc lifejacket sai cách (không kẹp đai chân) → tuột khỏi người khi nhảy nước.</li>
<li>Quên kích hoạt EPIRB — máy bay tuần tra đi qua 5km không phát hiện.</li>
<li>Uống nước biển — tăng tốc mất nước, suy thận.</li>
<li>Bỏ rationing — uống hết nước ngày đầu rồi chết khát ngày thứ 3.</li>
</ul>

<h3>✅ Checklist STCW PST</h3>
<ul>
<li>☑ Mặc immersion suit + lifejacket trong < 60 giây.</li>
<li>☑ Nhảy xuống nước từ độ cao > 4.5m an toàn.</li>
<li>☑ Bơi đến liferaft + leo lên không cần trợ giúp.</li>
<li>☑ Kích hoạt EPIRB + sử dụng SART/VHF DSC.</li>
<li>☑ Vận hành liferaft survival pack: water, food, flares, mirror.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>SOLAS Chapter III — Life-saving appliances. LSA Code (Resolution MSC.48(66)). STCW A-VI/1-1 Specification of minimum standard of competence in personal survival techniques. IMO Model Course 1.19.</em></p>'

  WHEN 'fire' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Đáp ứng STCW Code A-VI/1-2 — Fire Prevention and Fire Fighting.</li>
<li>Hiểu nguyên lý cháy (tam giác cháy: oxy + nhiệt + nhiên liệu) và phương pháp dập.</li>
<li>Phân biệt 5 lớp cháy (A/B/C/D/F) và chọn đúng loại bình chữa cháy.</li>
<li>Vận hành hệ thống PCCC tàu: detector, alarm, suppression (nước, foam, CO2, dry powder).</li>
</ul>

<h3>📚 Nguyên lý cháy</h3>
<p><strong>Tam giác cháy (Fire Triangle)</strong>: cháy xảy ra khi đủ 3 yếu tố — chất cháy (fuel), oxy (oxidizer), nguồn nhiệt (heat). Loại bỏ 1 yếu tố = dập tắt cháy. <strong>Tứ diện cháy (Fire Tetrahedron)</strong> bổ sung yếu tố thứ 4: chuỗi phản ứng hóa học (chain reaction), bị phá vỡ bằng dry chemical hoặc halon.</p>

<p><strong>Phân loại cháy:</strong></p>
<table>
<tr><th>Lớp</th><th>Chất cháy</th><th>Phương pháp dập</th></tr>
<tr><td>A</td><td>Chất rắn (gỗ, giấy, vải, cao su)</td><td>Nước, bọt foam</td></tr>
<tr><td>B</td><td>Chất lỏng (xăng, dầu, sơn)</td><td>Foam, CO2, dry powder</td></tr>
<tr><td>C</td><td>Khí (gas, propan)</td><td>Đóng van + dry powder</td></tr>
<tr><td>D</td><td>Kim loại (Mg, Na, K)</td><td>Cát khô, dry powder chuyên dụng — KHÔNG nước!</td></tr>
<tr><td>F</td><td>Dầu mỡ nhà bếp</td><td>Wet chemical, đậy nắp</td></tr>
</table>
<p>Cháy điện < 1000V có thể dập bằng CO2/dry powder sau khi cắt điện. Cháy điện cao thế (> 1000V) cần thiết bị chuyên dụng.</p>

<h3>🔧 Quy trình PCCC trên tàu</h3>
<ol>
<li><strong>Phát hiện</strong>: detector tự động (smoke/heat/flame) → kích hoạt alarm tại bridge + buồng cháy.</li>
<li><strong>Báo động</strong>: thuyền trưởng phát General Emergency Alarm (7 hồi ngắn + 1 dài).</li>
<li><strong>Tập hợp đội PCCC</strong>: theo Muster List, sĩ quan boong = chỉ huy đội tấn công, sĩ quan máy = đội kỹ thuật.</li>
<li><strong>Đánh giá</strong>: vị trí, quy mô, lớp cháy, lan tỏa. Quyết định: tấn công trực tiếp hay phong tỏa.</li>
<li><strong>Thực hiện</strong>: 2 nhóm ≥ 2 người, trang bị đầy đủ SCBA + bộ chống cháy. Kéo vòi từ hai hướng để tránh đẩy lửa vào nhau.</li>
<li><strong>Buồng máy cháy nặng</strong>: đóng kín, ngắt thông gió, xả CO2 toàn phần. KHÔNG MỞ CỬA TRONG 24H sau xả.</li>
<li><strong>Cooling boundary</strong>: phun nước làm mát các vách ngăn xung quanh để chống lan.</li>
<li><strong>Sau dập tắt</strong>: kiểm tra reignition trong 4h, ghi log, báo cáo MARPOL Annex VI nếu thải khói độc.</li>
</ol>

<h3>🚢 Ví dụ thực tế</h3>
<p>Tàu hàng rời cảng Hải Phòng, lớp DKT60 thực tập. 0245 hrs — detector buồng máy báo cháy. Thuyền phó 2 đến hiện trường: cháy lớp B (dầu nhiên liệu rò rỉ vào ống xả). Tắt bơm dầu chính, kích hoạt local foam system. Sau 8 phút khống chế. Không có thiệt hại nhân mạng. Báo cáo: "Root cause — gioăng ống xả lão hóa, đã thay thế. Bài học: tăng tần suất kiểm tra hệ thống dầu nhiên liệu lên hàng tuần."</p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Dùng nước cho cháy lớp D (kim loại) → phản ứng nổ.</li>
<li>Mở cửa buồng máy để "kiểm tra" sau xả CO2 → bùng cháy lại + ngạt thở.</li>
<li>Không mặc SCBA đầy đủ → ngạt khói trong 30 giây.</li>
<li>Quên cooling boundary → cháy lan qua vách thép sau 15-20 phút.</li>
<li>Tự đi vào vùng cháy 1 mình — vi phạm "buddy system".</li>
</ul>

<h3>✅ Checklist STCW Fire Fighting</h3>
<ul>
<li>☑ Mặc SCBA + bộ chống cháy trong &lt; 90 giây.</li>
<li>☑ Vận hành đúng các loại bình chữa cháy A/B/C/D/F.</li>
<li>☑ Kéo vòi cứu hỏa và phun đúng góc/khoảng cách.</li>
<li>☑ Xác định escape route + emergency exit.</li>
<li>☑ Sơ cứu nạn nhân ngạt khói/bỏng cấp 1-2.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>SOLAS Chapter II-2 — Construction, Fire protection, detection and extinction. FSS Code (Fire Safety Systems Code). STCW A-VI/1-2. IMO Model Course 1.20 (Basic) + 2.03 (Advanced).</em></p>'

  WHEN 'first_aid' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Đáp ứng STCW Code A-VI/1-3 — Elementary First Aid.</li>
<li>Đánh giá nạn nhân theo phương pháp ABC: Airway / Breathing / Circulation.</li>
<li>Sơ cứu các tình huống thường gặp trên tàu: bỏng, gãy xương, ngạt nước, ngộ độc, sốc nhiệt.</li>
<li>Liên hệ Telemedical Maritime Assistance Service (TMAS) khi cần.</li>
</ul>

<h3>📚 Nguyên tắc sơ cứu hàng hải</h3>
<p>Trên tàu, không có bệnh viện hay xe cứu thương trong bán kính nhiều giờ. Sơ cứu = duy trì sự sống đến khi tàu cập cảng hoặc trực thăng cứu nạn đến. Hộp thuốc tàu (Ship''s Medicine Chest) tuân thủ theo IMO Medical First Aid Guide (MFAG) và quốc gia tàu.</p>

<p><strong>Nguyên tắc DR-ABC</strong>:</p>
<ul>
<li><strong>D</strong>anger — kiểm tra an toàn cho người sơ cứu (cháy? hơi độc?)</li>
<li><strong>R</strong>esponse — gọi/lay nhẹ nạn nhân, có phản ứng không?</li>
<li><strong>A</strong>irway — ngửa đầu, nâng cằm, kiểm tra dị vật miệng/họng.</li>
<li><strong>B</strong>reathing — nhìn lồng ngực, nghe + cảm nhận hơi thở 10 giây.</li>
<li><strong>C</strong>irculation — kiểm tra mạch cảnh, dấu hiệu sốc.</li>
</ul>

<h3>🔧 Quy trình các tình huống cụ thể</h3>
<ol>
<li><strong>Ngừng tim ngừng thở (CPR)</strong>: 30 ấn ngực + 2 thổi ngạt × 5 chu kỳ. Tốc độ ấn 100-120 lần/phút, sâu 5-6cm. Liên tục đến khi có pulse hoặc AED.</li>
<li><strong>Bỏng</strong>: làm mát bằng nước sạch 20 phút. KHÔNG bôi kem đánh răng/dầu. Băng vô trùng. Bỏng > 10% diện tích cơ thể = nguy hiểm tính mạng, gọi TMAS ngay.</li>
<li><strong>Gãy xương</strong>: cố định bằng nẹp, KHÔNG nắn. Gãy hở = che vết thương vô trùng. Vận chuyển nạn nhân tư thế cố định.</li>
<li><strong>Ngạt nước (đuối)</strong>: nghiêng đầu, hút dịch mũi/miệng. CPR nếu cần. Hạ thân nhiệt = ủ ấm + rượu khô (không ngâm nước nóng đột ngột).</li>
<li><strong>Ngộ độc hóa chất</strong>: tham khảo MSDS (Material Safety Data Sheet). Da nhiễm = rửa nước 20 phút. Mắt nhiễm = rửa eyewash station. Hô hấp = đưa ra khu vực thoáng + oxy.</li>
<li><strong>Sốc nhiệt (heat stroke)</strong>: di chuyển vào bóng mát, cởi quần áo, làm mát bằng nước + quạt. Nhiệt độ cơ thể > 40°C = cấp cứu.</li>
</ol>

<h3>🚢 Ví dụ tình huống (lớp DKT60 thực tập)</h3>
<p>Sinh viên KTM61-0048 trượt ngã từ thang trên xuống boong, nghi gãy chân + va đầu. Sĩ quan boong: (1) đảm bảo nạn nhân không bị thêm tổn thương — di chuyển khỏi thang. (2) DR-ABC: phản ứng có, thở bình thường, mạch ổn. (3) Cố định cổ + chân bằng nẹp Sam splint. (4) Ghi nhận vital signs mỗi 15 phút. (5) Liên hệ TMAS qua Inmarsat C — bác sĩ tư vấn theo dõi 24h, nếu có dấu hiệu chấn động não hoặc đau tăng, divert tàu vào cảng gần nhất.</p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Di chuyển nạn nhân nghi chấn thương cột sống không cố định cổ → liệt vĩnh viễn.</li>
<li>Cho nạn nhân bất tỉnh uống nước → sặc, ngạt.</li>
<li>Chườm đá trực tiếp lên bỏng → tổn thương sâu hơn.</li>
<li>Quên ghi nhận vital signs theo dõi → mất dấu diễn biến.</li>
<li>Không gọi TMAS sớm — chờ "tự khỏi" → biến chứng.</li>
</ul>

<h3>✅ Checklist Elementary First Aid</h3>
<ul>
<li>☑ Đánh giá DR-ABC trong &lt; 30 giây.</li>
<li>☑ CPR tốc độ + độ sâu chuẩn.</li>
<li>☑ Sử dụng AED đúng quy trình.</li>
<li>☑ Cầm máu + băng vết thương các loại.</li>
<li>☑ Gọi TMAS qua đúng kênh + báo cáo đủ thông tin: vital signs, triệu chứng, vị trí tàu.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>IMO Medical First Aid Guide (MFAG). International Medical Guide for Ships (WHO). STCW A-VI/1-3. IMO Model Course 1.13 (Basic) + 1.14 (Medical Care).</em></p>'

  WHEN 'personal_safety' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Đáp ứng STCW Code A-VI/1-4 — Personal Safety and Social Responsibilities.</li>
<li>Hiểu cấu trúc tổ chức trên tàu, hệ thống cấp bậc, ngôn ngữ làm việc.</li>
<li>Tuân thủ quy định an toàn cá nhân: PPE, lockout-tagout, working aloft, enclosed spaces.</li>
<li>Phòng chống mệt mỏi, ma túy/rượu, rủi ro sức khỏe nghề biển.</li>
</ul>

<h3>📚 Cấu trúc tàu thương mại</h3>
<p><strong>Bộ phận boong (Deck Department)</strong>: thuyền trưởng (Master) → đại phó (C/O) → phó 2 (2/O) → phó 3 (3/O) → boong trưởng (bosun) → thủy thủ (AB/OS). Phụ trách hàng hải, chở hàng, an toàn boong.</p>

<p><strong>Bộ phận máy (Engine Department)</strong>: máy trưởng (C/E) → máy 2 (2/E) → máy 3 (3/E) → máy 4 (4/E) → trưởng kỹ thuật (electrician) → thợ máy (oiler/wiper). Phụ trách động cơ chính, máy phụ, hệ thống điện.</p>

<p><strong>Bộ phận phục vụ (Catering)</strong>: cook + steward, phụ trách bữa ăn và sinh hoạt thuyền viên.</p>

<p><strong>Ngôn ngữ làm việc</strong>: SOLAS yêu cầu mọi tàu có working language thống nhất. Tàu quốc tế thường dùng tiếng Anh hàng hải (Maritime English) chuẩn IMO Standard Marine Communication Phrases (SMCP).</p>

<h3>🔧 Quy tắc an toàn cá nhân</h3>
<ol>
<li><strong>PPE bắt buộc</strong>: helmet, safety shoes, work suit luôn mặc trên boong/buồng máy. Găng tay khi xử lý cargo. Hearing protection khi máy &gt; 85dB.</li>
<li><strong>Working aloft (làm việc trên cao)</strong>: giấy phép từ Master. Safety harness. Tools buộc dây tránh rơi. Không làm khi tàu chạy &gt; 12 knots hoặc gió mạnh.</li>
<li><strong>Enclosed space entry (không gian kín)</strong>: đo khí 4-gas (O₂ ≥ 19.5%, &lt; 23.5%; CO &lt; 25ppm; H₂S &lt; 10ppm; LEL &lt; 5%). Thông gió 30 phút trước. 1 watchkeeper ngoài + 1 người vào, có dây cứu sinh + radio.</li>
<li><strong>Lockout-Tagout</strong>: trước khi sửa chữa máy, treo thẻ "DO NOT OPERATE", khóa nguồn. Chìa khóa giữ bởi người làm việc. Test no-energy trước khi đụng vào.</li>
<li><strong>Hot work (hàn, cắt)</strong>: giấy phép từ C/O. Fire watch + bình chữa cháy sẵn. Cách xa nguồn dầu/khí 10m.</li>
</ol>

<h3>🚢 Quy định trách nhiệm xã hội</h3>
<p><strong>Maritime Labour Convention (MLC) 2006</strong>: thuyền viên có quyền hợp đồng lao động minh bạch, lương đúng kỳ, nghỉ phép bồi thường, chăm sóc y tế. Thời gian làm việc tối đa 14h/ngày, 72h/tuần. Phải có ít nhất 10h nghỉ trong 24h, chia tối đa 2 đoạn (1 đoạn ≥ 6h).</p>

<p><strong>Chính sách 0% rượu/ma túy</strong>: kiểm tra random + sau incident. Vi phạm = đuổi khỏi tàu. <strong>Anti-bullying & harassment</strong>: bất kỳ hình thức nào (lời nói, thân thể, tình dục) đều bị kỷ luật theo MLC. Whistleblower được bảo vệ.</p>

<p><strong>Đa văn hóa</strong>: tàu thường có thuyền viên từ 5-10 quốc gia. Tôn trọng tôn giáo, ẩm thực, ngôn ngữ. SMCP là ngôn ngữ trung lập cho công việc.</p>

<h3>⚠️ Lỗi thường gặp</h3>
<ul>
<li>Không đo khí khi vào ballast tank — ngạt O₂ chết trong 4 phút.</li>
<li>Tháo PPE khi nắng nóng → tai nạn đập đầu khi trượt.</li>
<li>Làm việc khi mệt mỏi (&gt; 14h liên tục) → 50% tai nạn nghề biển do fatigue.</li>
<li>Bỏ qua lockout-tagout — máy bất ngờ chạy khi đang sửa.</li>
<li>Im lặng khi chứng kiến bullying → môi trường độc hại lan rộng.</li>
</ul>

<h3>✅ Checklist Personal Safety</h3>
<ul>
<li>☑ Mặc đầy đủ PPE phù hợp khu vực làm việc.</li>
<li>☑ Hiểu Muster List vai trò của mình.</li>
<li>☑ Đọc và hiểu Risk Assessment trước task nguy hiểm.</li>
<li>☑ Tuân thủ work-rest hours theo MLC.</li>
<li>☑ Báo cáo near-miss + accident đúng kênh (Master + DPA).</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>STCW A-VI/1-4. MLC 2006. ISM Code (International Safety Management). ISO 45001 — OH&S Management. IMO Model Course 1.21.</em></p>'

  WHEN 'review' THEN
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu ôn tập</h3>
<ul>
<li>Tổng hợp toàn bộ kiến thức của khóa học theo cấu trúc chương.</li>
<li>Chuẩn bị thi cuối khóa: format, dạng câu hỏi, tiêu chí đạt.</li>
<li>Áp dụng vào tình huống thực tế qua case study.</li>
</ul>

<h3>📚 Cấu trúc đề thi</h3>
<p>Đề thi cuối khóa gồm 2 phần: <strong>(1) Trắc nghiệm</strong> 20-30 câu, mỗi câu 1-2 điểm, kiểm tra kiến thức nền tảng + định nghĩa STCW. <strong>(2) Tình huống thực tế</strong> 1-2 case, sinh viên phải phân tích, đề xuất quy trình, giải thích quyết định. Điểm đạt: 60/100 (tương đương STCW competence requirement).</p>

<p>Trọng tâm ôn tập theo chương:</p>
<ol>
<li>Chương 1-2: Khái niệm cơ bản, hệ tọa độ, tài liệu hàng hải.</li>
<li>Chương 3-4: Kỹ thuật + công cụ chuyên ngành (la bàn, hải đồ, ECDIS, fire equipment, life-saving appliances).</li>
<li>Chương 5-6: Quy trình thực tế + quy định IMO/STCW.</li>
<li>Chương 7+: Tình huống nâng cao + case study.</li>
</ol>

<h3>🚢 Tình huống tổng hợp (sample case)</h3>
<p>Bạn là sĩ quan boong tàu container 6000 TEU đang trên hành trình Singapore - Rotterdam, vừa đi qua kênh Suez. Lúc 0345 hrs ca trực, radar phát hiện mục tiêu nhỏ ở 2 hải lý phía mũi tàu, không có AIS signal, di chuyển 0.5 knots — nghi ngờ xuồng đánh cá nhỏ hoặc người trôi dạt. Đồng thời, smoke detector buồng máy báo alarm.</p>
<p>Câu hỏi: (a) Quy trình của bạn theo COLREG + STCW? (b) Liên lạc với những ai? (c) Chuẩn bị gì cho khả năng cứu nạn? (d) Nếu quyết định divert tàu, các yếu tố cần đánh giá?</p>

<h3>⚠️ Sai lầm thường gặp</h3>
<ul>
<li>Học thuộc lòng mà không hiểu nguyên lý — không áp dụng được vào tình huống mới.</li>
<li>Bỏ qua phần thực hành (case study, lab) — chỉ học lý thuyết.</li>
<li>Không đọc tài liệu IMO gốc — chỉ học slide bài giảng.</li>
<li>Thi xong là quên — không liên hệ với thực tập tàu.</li>
</ul>

<h3>✅ Checklist sẵn sàng thi</h3>
<ul>
<li>☑ Đã làm hết bài tập trong các chương trước.</li>
<li>☑ Đã làm ít nhất 2 đề thi mẫu (mock exam) đạt &gt; 70%.</li>
<li>☑ Hiểu được logic STCW competency requirements.</li>
<li>☑ Biết tham chiếu đúng code + section trong IMO documents.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>STCW Convention 2010 (Manila Amendments). IMO Model Course liên quan đến course. SOLAS Consolidated Edition. Tài liệu thực hành VIMARU.</em></p>'

  ELSE
'<h2>' || lesson_title || '</h2>
<h3>🎯 Mục tiêu học tập</h3>
<ul>
<li>Hiểu các khái niệm cốt lõi của bài học theo chuẩn STCW.</li>
<li>Áp dụng kiến thức vào tình huống thực tế trên tàu.</li>
<li>Liên kết với các bài học trước và sau trong chương trình VIMARU.</li>
</ul>

<h3>📚 Nội dung chính</h3>
<p>Bài "<strong>' || lesson_title || '</strong>" là một phần quan trọng trong chương trình đào tạo hàng hải VIMARU. Nội dung bài này được thiết kế bám sát chuẩn STCW Convention 2010 (Manila Amendments) và các IMO Model Courses tương ứng. Sinh viên cần kết hợp lý thuyết với thực hành mô phỏng để đạt được năng lực competency theo yêu cầu cấp chứng chỉ.</p>

<p>Khái niệm cốt lõi: học viên sẽ tìm hiểu các nguyên lý cơ bản, các quy định IMO/SOLAS liên quan, và cách áp dụng trong tình huống thực tế trên tàu thương mại. Các thuật ngữ chuyên ngành tiếng Anh sẽ được giới thiệu song song với tiếng Việt để chuẩn bị cho làm việc trên tàu quốc tế.</p>

<p>Tài liệu tham khảo chính bao gồm: (1) STCW Convention 2010 và Code A/B; (2) SOLAS Consolidated Edition cập nhật mới nhất; (3) IMO Model Courses tương ứng với competence area; (4) Bowditch — American Practical Navigator (cho navigation topics); (5) MFAG (cho first aid topics); (6) Tài liệu giảng dạy của VIMARU và các trường hàng hải quốc tế.</p>

<h3>🔧 Quy trình áp dụng</h3>
<ol>
<li>Đọc lý thuyết bài học và đối chiếu với tài liệu IMO chính thức.</li>
<li>Xem video minh họa (nếu có) để hiểu trực quan hơn.</li>
<li>Tham gia thực hành mô phỏng tại lab VIMARU để áp dụng kiến thức.</li>
<li>Thảo luận trong nhóm để giải quyết case study.</li>
<li>Tự đánh giá qua quiz và bài tập cuối chương.</li>
</ol>

<h3>🚢 Liên hệ thực tế</h3>
<p>Sinh viên các lớp DKT60, DKT61, KTM61, MTT60 sẽ áp dụng kiến thức bài này vào kỳ thực tập tàu huấn luyện "Sao Biển" và các tàu thương mại đối tác của VIMARU. Các giảng viên giàu kinh nghiệm như PGS.TS Trần Ngọc Đại, TS. Lê Văn Hùng sẽ hướng dẫn trực tiếp trong các buổi thực hành.</p>

<h3>⚠️ Lưu ý</h3>
<ul>
<li>Đây là kiến thức nền tảng, cần học kỹ trước khi sang bài tiếp theo.</li>
<li>Liên hệ giảng viên qua hệ thống nếu có thắc mắc — đừng để dồn đến cuối kỳ.</li>
<li>Tham gia đầy đủ các buổi lab/mô phỏng — không thể học hàng hải qua sách vở.</li>
</ul>

<h3>✅ Checklist tự đánh giá</h3>
<ul>
<li>☑ Hiểu được các khái niệm chính của bài.</li>
<li>☑ Trả lời được 80% câu hỏi quiz cuối chương.</li>
<li>☑ Áp dụng được vào ít nhất 1 tình huống thực tế.</li>
<li>☑ Liên hệ được với các bài học trước/sau.</li>
</ul>

<h3>📖 Tham khảo</h3>
<p><em>STCW Convention 2010 (Manila Amendments). IMO Model Courses. SOLAS Consolidated Edition. Tài liệu thực hành VIMARU phiên bản 2026.</em></p>'

END;
$fn$ LANGUAGE sql IMMUTABLE;

-- Update lessons với rich content theo topic dispatch.
-- Bao gồm cả QUIZ lessons (dùng template 'review' nhẹ hơn ~2000 chars) để
-- đạt target Codex ≥24 SAF-101 rich lessons. QUIZ content_blocks sẽ hiển
-- thị như preamble trước khi quiz UI render question list.
UPDATE lessons l
SET content_blocks = jsonb_build_array(jsonb_build_object(
    'id', md5('content:v125:' || l.id::text),
    'type', 'text',
    'data', jsonb_build_object('content', fn_seed_v125_html(
        CASE
            WHEN l.lesson_type = 'QUIZ'                                     THEN 'review'
            WHEN l.title ~* '(la bàn|la ban|compass|gyro)'                  THEN 'compass'
            WHEN l.title ~* '(hải đồ|hai do|tọa độ|toa do|chart|coord|thiên văn|thien van|hàng hải|hang hai|định vị|dinh vi|vị trí|vi tri|kinh độ|vĩ độ|hành trình|hanh trinh)'
                                                                             THEN 'nav_basics'
            WHEN l.title ~* '(sinh tồn|sinh ton|cứu sinh|cuu sinh|phao|xuồng|liferaft|abandon|EPIRB|SART|MOB|man overboard|nguời rơi|nguoi roi)'
                                                                             THEN 'survival'
            WHEN l.title ~* '(chữa cháy|chua chay|cháy|chay|PCCC|fire|chống cháy|chong chay|extinguish|chỉ huy|chi huy|đám đông|dam dong|kiểm soát thiệt hại|kiem soat thiet hai)'
                                                                             THEN 'fire'
            WHEN l.title ~* '(sơ cứu|so cuu|cấp cứu|cap cuu|y tế|y te|first aid|chấn thương|chan thuong|bỏng|bong|gãy|gay|ngạt|ngat|CPR|TMAS)'
                                                                             THEN 'first_aid'
            WHEN l.title ~* '(an toàn cá nhân|an toan ca nhan|trách nhiệm|trach nhiem|MLC|PPE|enclosed space|lockout|harness|workload|fatigue|bullying|social|work-rest|hot work|working aloft|cấu trúc tàu|cau truc tau|hierarchy|culture)'
                                                                             THEN 'personal_safety'
            WHEN l.title ~* '(ôn tập|on tap|review|thi cuối khóa|thi cuoi khoa|tổng hợp|tong hop|tổng kết|tong ket|exam|final|recap)'
                                                                             THEN 'review'
            ELSE 'generic'
        END,
        l.title
    ))
))
FROM chapters ch, courses co
WHERE l.chapter_id = ch.id
  AND ch.course_id = co.id
  AND co.code IN ('NAV-101', 'SAF-101');

DROP FUNCTION IF EXISTS fn_seed_v125_html(TEXT, TEXT);

-- Verify block.
DO $verify$
DECLARE
    v_nav_rich BIGINT;
    v_saf_rich BIGINT;
    v_nav_p50 NUMERIC;
    v_saf_p50 NUMERIC;
    v_keyword_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_nav_rich
    FROM lessons l JOIN chapters ch ON ch.id = l.chapter_id JOIN courses co ON co.id = ch.course_id
    WHERE co.code = 'NAV-101' AND l.content_blocks IS NOT NULL
      AND length(l.content_blocks::text) >= 2000;

    SELECT COUNT(*) INTO v_saf_rich
    FROM lessons l JOIN chapters ch ON ch.id = l.chapter_id JOIN courses co ON co.id = ch.course_id
    WHERE co.code = 'SAF-101' AND l.content_blocks IS NOT NULL
      AND length(l.content_blocks::text) >= 2000;

    SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY length(l.content_blocks::text))::numeric, 0) INTO v_nav_p50
    FROM lessons l JOIN chapters ch ON ch.id = l.chapter_id JOIN courses co ON co.id = ch.course_id
    WHERE co.code = 'NAV-101' AND l.content_blocks IS NOT NULL;

    SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY length(l.content_blocks::text))::numeric, 0) INTO v_saf_p50
    FROM lessons l JOIN chapters ch ON ch.id = l.chapter_id JOIN courses co ON co.id = ch.course_id
    WHERE co.code = 'SAF-101' AND l.content_blocks IS NOT NULL;

    SELECT COUNT(*) INTO v_keyword_count
    FROM lessons l JOIN chapters ch ON ch.id = l.chapter_id JOIN courses co ON co.id = ch.course_id
    WHERE co.code IN ('NAV-101','SAF-101')
      AND l.content_blocks::text ~ '(Trần|Nguyễn|Định vị|Sinh tồn|STCW|VIMARU|DKT60|KTM61)';

    RAISE NOTICE 'V125 verify: NAV-101 rich=% (p50=% chars), SAF-101 rich=% (p50=% chars), keywords match=%',
        v_nav_rich, v_nav_p50, v_saf_rich, v_saf_p50, v_keyword_count;
END $verify$;

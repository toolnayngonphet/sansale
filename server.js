const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors'); // Bổ sung để hỗ trợ Frontend gọi API mượt mà không lo bị chặn
const app = express();

app.use(cors()); // Kích hoạt CORS cho phép mọi nguồn kết nối đến API này
app.use(express.json());
// Phục vụ giao diện frontend nằm trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// CẤU HÌNH CỦA BẠN
const MY_AFFILIATE_ID = "17344490003"; 

app.post('/api/split-link', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp link Shopee' });
        }

        // Mặc định ban đầu: Nếu luồng lấy voucher lỗi, ta trả luôn link gốc cho Bước 1 để tránh sập giao diện
        let step1VoucherLink = url; 

        // BƯỚC 1: Đấu API sang Salesoc kèm cơ chế try/catch bọc riêng nhằm tránh lỗi Unexpected end of JSON input
        try {
            const salesocResponse = await axios.post('https://salesoc.vn/api/convert-with-shelf', {
                url: url,
                isRetry: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://salesoc.vn',
                    'Referer': 'https://salesoc.vn/'
                },
                timeout: 5000 // Giới hạn đợi phản hồi từ đối tác trong 5 giây
            });

            // Kiểm tra kỹ cấu trúc dữ liệu trả về từ Salesoc trước khi bóc tách
            if (salesocResponse && salesocResponse.data && salesocResponse.data.success === true) {
                const data = salesocResponse.data;
                
                // ==================== KHU VỰC DEBUG HỆ THỐNG ====================
                console.log("\n=================== SALESOC DATA DEBUG ===================");
                console.log("👉 Link bạn nhập vào (url):", url);
                console.log("👉 Link rút gọn Shopee (affipadShortUrl):", data.affipadShortUrl || "N/A (RỖNG)");
                console.log("👉 Link Facebook ngắn (shortFacebookAffiliateUrl):", data.shortFacebookAffiliateUrl || "N/A (RỖNG)");
                console.log("👉 Link Facebook thô (facebookAffiliateUrl):", data.facebookAffiliateUrl ? "Có dữ liệu (Payload dài)" : "N/A (RỖNG)");
                console.log("==========================================================\n");
                // ================================================================

                // THUẬT TOÁN ĐƯỢC ÉP LẠI CHẶT CHẼ: Kiểm tra đích danh trường affipadShortUrl trước
                if (data.affipadShortUrl && data.affipadShortUrl.trim() !== "") {
                    step1VoucherLink = data.affipadShortUrl; // Ép lấy chuẩn link https://shp.ee/...
                } else {
                    // Nếu hoàn toàn không có affipadShortUrl thì mới dự phòng theo thứ tự dưới này
                    step1VoucherLink = data.shortFacebookAffiliateUrl || 
                                       data.facebookAffiliateUrl || 
                                       data.affiliateUrl || 
                                       url;
                }
            }
        } catch (apiErr) {
            // Khi Salesoc chặn IP local hoặc dính lỗi kết nối, log ra màn hình console của bạn để theo dõi
            console.log('⚠️ Không lấy được voucher từ Salesoc (Có thể bị chặn Cloudflare/CORS):', apiErr.message);
        }

        // BƯỚC 2: Tự dựng link Affiliate chính chủ của bạn (Dùng ID của bạn để đè Cookie ăn hoa hồng)
        const step2AffiliateLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(url)}&affiliate_id=${MY_AFFILIATE_ID}&sub_id=buoc2_chotdon`;

        // BẮT BUỘC LUÔN PHẢI TRẢ VỀ JSON HỢP LỆ CHO FRONTEND ĐỂ KHÔNG BỊ LỖI PHÂN TÍCH CÚ PHÁP
        return res.json({
            success: true,
            step1: step1VoucherLink,
            step2: step2AffiliateLink
        });

    } catch (error) {
        console.error("❌ Lỗi Core Hệ Thống:", error);
        // Fallback bảo vệ tầng cuối cùng, chặn đứng hoàn toàn lỗi 'Unexpected end of JSON input' ở Client
        return res.json({ 
            success: true, 
            step1: req.body.url || "https://shopee.vn", 
            step2: `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(req.body.url || '')}&affiliate_id=${MY_AFFILIATE_ID}` 
        });
    }
});

// ĐÃ CẬP NHẬT: Ưu tiên bốc cổng do Railway cấp phát ngẫu nhiên, nếu không có mới dùng cổng mặc định 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hệ thống phân luồng săn sale đang chạy tại cổng: ${PORT}`));

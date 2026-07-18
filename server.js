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

// BỘ NHỚ LƯU TRỮ LINK RÚT GỌN TẠM THỜI (In-Memory Object)
const shortLinksStorage = {};

// BỘ NHỚ ĐỆM GIẢI MÃ LINK: Ánh xạ từ link ngắn của khách sang link dài lấy từ Addlivetag
const resolvedLinksCache = {};

// HÀM TẠO CHUỖI NGẪU NHIÊN LÀM MÃ RÚT GỌN
function generateRandomCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// ROUTE MỚI: Đứng trung gian bốc thông tin sản phẩm và lọc bỏ hoa hồng trước khi gửi về client
app.post('/api/product-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'Thiếu URL sản phẩm' });
        }

        const prodResponse = await axios.get(`https://data.addlivetag.com/product-data/product-data.php?url=${encodeURIComponent(url)}`, {
            timeout: 5000
        });

        if (prodResponse.data && prodResponse.data.status === "success") {
            const info = prodResponse.data.productInfo;
            
            // BẮT TRÚNG TRƯỜNG productLink ĐỂ ĐÈ ĐƯỜNG DẪN DÀI VÀO CACHE RIÊNG BIỆT
            if (info && info.productLink) {
                resolvedLinksCache[url.trim()] = info.productLink;
                console.log(`🎯 Đã lưu cache link dài từ Addlivetag: ${info.productLink}`);
            }
            
            // TUYỆT ĐỐI KHÔNG TRẢ VỀ: commission, sellerComFinal, shopeeComFinal để giấu khách hoàn toàn
            return res.json({
                success: true,
                productName: info.productName,
                price: info.price,
                sales: info.sales,
                rating: info.rating
            });
        }
        
        return res.json({ success: false, message: "Không lấy được chi tiết sản phẩm" });
    } catch (error) {
        console.log("⚠️ Lỗi fetch dữ liệu thông tin sản phẩm:", error.message);
        return res.json({ success: false, message: error.message });
    }
});

app.post('/api/split-link', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp link Shopee' });
        }

        // Mặc định ban đầu: Tạo biến chứa kết quả của Salesoc
        let step1VoucherLink = ""; 

        // BƯỚC 1: Đấu API sang Salesoc kèm cơ chế try/catch bọc riêng nhằm tránh lỗi Unexpected end of JSON input
        // GIỮ NGUYÊN 100% KHÔNG THAY ĐỔI LOGIC VÀ BIẾN SỐ ĐỂ TRÁNH LỖI TIMEOUT
        try {
            const salesocResponse = await axios.post('https://salesoc.vn/api/convert-with-shelf', {
                url: url,
                isRetry: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Origin': 'https://salesoc.vn',
                    'Referer': 'https://salesoc.vn/'
                },
                timeout: 8000 // TĂNG LÊN 8 GIÂY: Tránh tình trạng mạng kết nối quốc tế từ Railway về VN bị nghẽn
            });

            // Kiểm tra kỹ cấu trúc dữ liệu trả về từ Salesoc trước khi bóc tách
            if (salesocResponse && salesocResponse.data && salesocResponse.data.success === true) {
                const data = salesocResponse.data;
                
                // ==================== KHU VỰC DEBUG HỆ THỐNG ====================
                console.log("\n=================== SALESOC DATA DEBUG ===================");
                console.log("👉 Link bạn nhập vào (url):", url);
                console.log("👉 Link rút gọn Shopee (affipadShortUrl):", data.affipadShortUrl || "N/A (RỖNG)");
                console.log("👉 Link Facebook ngắn (shortFacebookAffiliateUrl):", data.shortFacebookAffiliateUrl || "N/A (RỖNG)");
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
            } else {
                // Nếu kết nối thành công nhưng cấu trúc trả về không có success true, chặn luồng báo lỗi cho khách luôn
                return res.json({
                    success: false,
                    message: "Tạm hết mã giảm giá hoặc website đang quá tải, vui lòng thử lại sau 5s"
                });
            }
        } catch (apiErr) {
            console.log('⚠️ Không lấy được voucher từ Salesoc (Có thể bị chặn Cloudflare/CORS):', apiErr.message);
            
            // CẬP NHẬT MỚI: Trả lỗi trực tiếp về cho khách hàng, không sử dụng luồng link gốc dự phòng nữa
            return res.json({
                success: false,
                message: "Tạm hết mã giảm giá hoặc website đang quá tải, vui lòng thử lại sau 5s"
            });
        }

        // ==================== TỐI ƯU LUỒNG BƯỚC 2: SỬ DỤNG LINK GỐC DÀI TRỊ LỖI OOPS ====================
        // Kiểm tra xem trong cache riêng biệt đã lưu được link dài lấy từ Addlivetag cho URL này chưa
        const finalUrlForStep2 = resolvedLinksCache[url.trim()] || url;

        // Cập nhật dấu & nối chuẩn, sử dụng link dài đã encode cho origin_link để Shopee nhận diện chính xác
        const step2RawLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(finalUrlForStep2)}&affiliate_id=${MY_AFFILIATE_ID}`;

        // ==================== TIẾN HÀNH RÚT GỌN NỘI BỘ BƯỚC 2 ====================
        const shortCode = generateRandomCode(6); // Sinh mã 6 ký tự ngẫu nhiên
        shortLinksStorage[shortCode] = step2RawLink; // Ánh xạ mã vào link đích thô
        
        // Lấy host và protocol động (Tự thích ứng cả localhost lẫn domain deploy chính thức)
        const hostUrl = req.get('host'); 
        const protocol = req.protocol; 
        
        // Tạo liên kết rút gọn hiển thị bằng chính tên miền của bạn
        const step2AffiliateLink = `${protocol}://${hostUrl}/r/${shortCode}`;

        // BẮT BUỘC LUÔN PHẢI TRẢ VỀ JSON HỢP LỆ CHO FRONTEND ĐỂ KHÔNG BỊ LỖI PHÂN TÍCH CÚ PHÁP
        return res.json({
            success: true,
            step1: step1VoucherLink,
            step2: step2AffiliateLink
        });

    } catch (error) {
        console.error("❌ Lỗi Core Hệ Thống:", error);
        return res.json({ 
            success: false, 
            message: "Tạm hết mã giảm giá hoặc website đang quá tải, vui lòng thử lại sau 5s"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hệ thống phân luồng săn sale đang chạy tại cổng: ${PORT}`);
});

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

// BỘ NHỚ ĐỆM GIẢI MÃ LINK: Ánh xạ từ link ngắn của khách sang link dài lấy từ Addlivetag
const resolvedLinksCache = {};

// ==================== ENDPOINT: BỐC VOUCHER ĐỘNG TỪ SALESOC ====================
app.get('/api/vouchers', async (req, res) => {
    try {
        // Gọi trực tiếp đến API thực tế của Salesoc kèm header bypass Cloudflare
        const response = await axios.get('https://salesoc.vn/api/vouchers', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Origin': 'https://salesoc.vn',
                'Referer': 'https://salesoc.vn/',
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache', // Ép server trả về data mới nhất, không nhận 304 Not Modified từ browser cache
                'Pragma': 'no-cache'
            },
            timeout: 6000
        });

        // Kiểm tra cấu trúc mảng dữ liệu trả về từ đối tác
        if (response.data && Array.isArray(response.data)) {
            return res.json({
                success: true,
                vouchers: response.data
            });
        }

        return res.json({ success: false, message: "Không phân tích được danh sách voucher từ Salesoc" });
    } catch (error) {
        console.log("⚠️ Lỗi fetch dữ liệu voucher động từ Salesoc:", error.message);
        return res.json({ success: false, message: error.message });
    }
});

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

                // TỐI ƯU LUỒNG BƯỚC 2: Sử dụng link gốc dài trị lỗi OOPS màn hình Shopee
                const finalUrlForStep2 = resolvedLinksCache[url.trim()] || url;
                const step2AffiliateLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(finalUrlForStep2)}&affiliate_id=${MY_AFFILIATE_ID}`;

                // TRẢ VỀ ĐẦY ĐỦ CÁC LUỒNG ĐỂ FRONTEND RENDERING ĐỘNG BƯỚC 1 VÀ BƯỚC 2
                return res.json({
                    success: true,
                    fbLink: data.affipadShortUrl || "",
                    ytbLink: data.affiliateUrl || "",
                    igLink: data.shortInstagramAffiliateUrl || data.instagramAffiliateUrl || "",
                    step2: step2AffiliateLink
                });
            } else {
                // Thất bại trong việc lấy dữ liệu thành công từ Salesoc -> Trả thông báo lỗi trực tiếp
                return res.json({
                    success: false,
                    message: "Tạm hết mã giảm giá hoặc website đang quá tải, vui lòng thử lại sau 5s"
                });
            }
        } catch (apiErr) {
            console.log('⚠️ Không lấy được voucher từ Salesoc (Có thể bị chặn Cloudflare/CORS):', apiErr.message);
            
            // CHẶN BÁO LỖI: Không gán link gốc nữa mà trả thẳng thông điệp lỗi cho client
            return res.json({
                success: false,
                message: "Tạm hết mã giảm giá hoặc website đang quá tải, vui lòng thử lại sau 5s"
            });
        }

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

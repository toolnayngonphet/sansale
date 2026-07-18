const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors'); // Bổ sung để hỗ trợ Frontend gọi API mượt mà không lo bị chặn
const app = express();

app.use(cors()); // Kích hoạt CORS cho phép mọi nguồn kết nối đến API này
app.use(express.json());
// Phục vụ giao diện frontend nằm trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// CẤU HÌNH CỦA BẠN (Dùng để dựng liên kết thô làm phương án cứu cánh Fallback khi Cookie hỏng)
const MY_AFFILIATE_ID = "17344490003"; 

// KHO LƯU TRỮ BỘ COOKIE ADMIN (Cập nhật tươi mới liên tục qua API từ xa mà không cần restart server)
let ADMIN_COOKIES = {
    cookie: "_QPWSDCXHZQA=f6c3f23b-4f40-446c-a310-91c57d409ab1; REC7iLP4Q=fdf43530-a997-4e20-85cf-731ac0fc56e1; SPC_F=bDFWvWMpFmcUwgOj3qwMq5449RmCEvk7; REC_T_ID=551a4d10-af4b-11f0-b819-c6f6ded79398; SPC_CLIENTID=YkRGV3ZXTXBGbWNVvyejmdixchzrybns; _ga=GA1.1.438220876.1761139849; language=vi; _gcl_gs=2.1.k1$i1778153217$u184265188; _gcl_au=1.1.847024400.1778153219; SPC_EC=-; _fbp=fb.1.1778153220556.424069424392917891; _gcl_aw=GCL.1778153221.Cj0KCQjw8PDPBhCeARIsAOJwmWUFAW-iiSGRQ6sukMXeY7_CqZujJodXKkZc1yLrcmb3MJ5plF41BRIaAv0WEALw_wcB; _hjSessionUser_868286=eyJpZCI6ImNjMmYxOTJjLWY1YTYtNWE5Mi1hOGZmLWFkNzhmMTk1NmM5OCIsImNyZWF0ZWQiOjE3NjE4ODg3OTAwNjEsImV4aXN0aW5nIjp0cnVlfQ==; SPC_SI=H3YnagAAAABQZUtCcjJpUD9w5AIAAAAAUWcySTdVTkU=; _med=affiliates; SPC_ST=UzJ5WElwSUEwTHdrdzdQWNOVPykDFfOqDMNGhvlz+NGsV+dDICDju2C/Ep5BxpODxfjoxMjaJg3db2BEZMR3z6XJLdJIguQlOG48Jx//tUjH0SWWvHhEKQ2FMXalUsFG2tuykRQTNBAflDP5WiS6Z/lexm1S3yCJIpT6aVkmSVGHNPKpze0PSICf47TkhUWc/tR0G384C8/9t4mvCUS7jw==.AEgFDVUJmU1ZhiEI+emRmSxi6EIE/OH+0mtY0qHD+M6N; SPC_U=132474449; SPC_R_T_IV=dzhJbUp3RXAyeW54UjRwUw==; SPC_T_ID=KftBhjfGdfjuHj7oMwGdiTFGb5+0e8yYXCxnMvNBHoGYIP++ZVWpbLZXbt/CjZrkGEM7nnOObvISQ+sQnTjWr8k/Q7sulqJg7GA6uiB5kvR/vIoquy8ztJTWtgSLzWUO1Y2hye+vynFluLE5GpoG0F4lpKrRUNd3ty4MoyrlT7I=; SPC_T_IV=dzhJbUp3RXAyeW54UjRwUw==; SPC_R_T_ID=KftBhjfGdfjuHj7oMwGdiTFGb5+0e8yYXCxnMvNBHoGYIP++ZVWpbLZXbt/CjZrkGEM7nnOObvISQ+sQnTjWr8k/Q7sulqJg7GA6uiB5kvR/vIoquy8ztJTWtgSLzWUO1Y2hye+vynFluLE5GpoG0F4lpKrRUNd3ty4MoyrlT7I=; _med=refer; _ga_J9F4X41J51=GS2.1.s1784334033$o1$g1$t1784334045$j48$l0$h0; csrftoken=wBru9AkogAaXoNnfhuyNGRs8K2onruzh; SPC_CDS_CHAT=c2762ed3-03b1-49c6-8f63-90a9884e95f5; language=vi; _sapid=4636076ecfeaff06436bcb6c19562153005340a2e303d9f496b1e3cc; _ga_FV78QC1144=GS2.1.s1784387229$o4$g1$t1784387283$j6$l0$h0; _fbc=fb.1.1784387467736.iD1PusGz25U1sKiy; _hjSession_868286=eyJpZCI6IjI0NjM4N2IxLTg4YmQtNGMzNS1hNzM4LWE2YzNlZTUwMjQyYyIsImMiOjE3ODQzODc0NzE0NTMsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; sense_sa_r=s; shopee_webUnique_ccd=PLbTIn0enqVSCfTgVTROMg%3D%3D%7CNe4bP1oa%2FATvw0TYEv6biSXgubE96Mf2Ms4JsbWw2IxnqoVwq%2Bh37iegPHALVYWLP5y1FoKIjfn5DHs%3D%7CNOV5xa1Y9Grkeu4n%7C08%7C3; ds=427f91ca110eb6d7be80a3bd9b7df53c; _ga_4GPP1ZXG63=GS2.1.s1784385520$o11$g1$t1784389253$j51$l0$h784584293",
    csrf_token: "8wrDz62t-DnE_rj3vAwgLj2VBUwmEIzM8XDQ",
    sz_token: "Lqe4znIGqXlMPt+5OiJsNQ==|NO4bP1oa/ATvw0TYEv6biSXgubE96Mf2Ms4JsVcf4YxnqoVwq+h37iegPHALVYWLP5y1FoKIjfn5Dns=|NOV5xa1Y9Grkeu4n|08|3",
    sap_ri: "899e5b6ac702b4bfa9ac88330501d5c752bb320beb3b35a7cace",
    sap_sec: "xCTHI5N/llNzCjAHGlRHGjHHcldJGjHHVlRZGf6HvldCGzbHwIRrGfAHuDcKGm5H7lRXGzwH9lRwGjrH2QRAGxpH/QcHGy5HUldxGaVHCldpGibH0IdfGa6HZIRjGx5H6lcuGy6HAldwGZRHWlc1GxjHaIRRGiRH2ldIGxAHNlRVGguHTQdGGlRHPl6HGlRHGl+4fmKpGlRHkFYa+AOuGQRHGlRHzk66ouiHGQRHtl2HGYd3HfzHGxJbnl6HGlRHCj2HGfdHGlQV1RAeGlRHn/SIWlRHGGzeGlRVGIRHIkLJ5IRHGfirGDRHyl2HGlRHfyBv3uGqGlRHE8xJqpVAGDRHGlQOz55SGldSbQRsXPkkqOy9GGvXGQRHGlQQoF5EGlQHGDRHGaoLTse38IafXqr6Glcp1ojHGlRPevP1zJp7wzoVfFp8Bu2A4lqiWSOVN4Cj87/DLtvq2TRexpzk1vARvUKrBebr+smcRnO8riM1OJiaDYF1d7k7Nkm0EkwP7nG/efu7AkgDB5A+UfSiPYIkaYrEDgclJooD8TuYjqUMloClxo0OWHVAl/TktDPn24lUKAoUL81RKxjBP4Jyy/Kbkb729NfLQ7+ITpivJE/9V0NJzHLYNzuvV32T72yAAnco6MkqqnuLh95b5aaM/afxlC3aiHAQSFjFnhPMmnQRqAXs+yWPLNLM3MQE6yBWOScp0moieMraVf/s9Xj7E5FPCIRHGlzHGlcmSsebUsIaGl5HGlcyNKekMIRHGmuFuNDB5NQkgkc+MlinAP9W6R+D+clTyrl/xqnjiaGD8zeYb7CK4wPfbJ2VafJ28eJ/vJkFQ45I6SfY988w0I2Z48fszQ2WqPy6BzVv7AamiMVlSJA/p8FRPihZ8LBCGmI1gWwtNRIMkuck3AgGTVQG0NzShe5g8NI8LfKhaBcsJbFrdg9mpkdwxllEitrY/lHxd1c86Tog37hg7e4U7e/vSdVHClRHGyd7vwHrGlRH59nVTkzX+sstFoofGlRHGlRHGlRHGlRHvlRHGxjO3QpEyVPy7Qm7GQpadVgMwZNeC5Wc3/V8B4zvyntv3iBtArR9dtnzzqklDd8Wh2yY4iweDYt3Y4iweDYt3N5OtYrpXdvMla0R2DRW9KZow2NYFytfp0jQu8QRHGlRHGlRHGlRHGm2HGlcTfH2UjNIjLS9WBd2T9um3ORhlGy5HGlQifo0lDyG83okYPr9xmafHN4/zjN28NGZXfYAFgd8qha9YQjjHGlRHzlRHGwTCON9Gj7G3N4hbjddl+nBjF02TfXtD/wizPj9wialp5jBVAj694CP9F0kzgdIlhp+CQrbvi2U2GlRHGlzHGld/wAHgHFF+IIRHGlRHGlRHaQRHGg9aLDbXI6I3wuEeYWu8yq5CFuw0url+THKeG+BrsIRHwlRHGCySEWYhaUWCwlRHGz2b8Rzbli0UGlRHGC=="
};

// API ADMIN ĐẶC QUYỀN: Dùng để làm cổng cập nhật Token mới từ xa mà không phải sửa code hay xóa server
app.post('/api/admin/update-cookie', (req, res) => {
    const { cookie, csrf_token, sz_token, sap_ri, sap_sec } = req.body;
    
    if (!cookie || !csrf_token) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ các tham số Cookie và CSRF-Token!' });
    }

    ADMIN_COOKIES = { cookie, csrf_token, sz_token, sap_ri, sap_sec };
    console.log("✅ Ghi nhận hệ thống Admin đã thay đổi bộ Cookie Shopee mới thành công!");
    return res.json({ success: true, message: 'Cấu hình cập nhật thông tin Cookie thành công!' });
});

// ROUTE TRUNG GIAN BỐC THÔNG TIN SẢN PHẨM GIẤU HOA HỒNG
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

        let step1VoucherLink = url; 
        let step2AffiliateLink = "";

        // ==================== BƯỚC 1: LẤY VOUCHER TỪ SALESOC ====================
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
                timeout: 8000
            });

            if (salesocResponse && salesocResponse.data && salesocResponse.data.success === true) {
                const data = salesocResponse.data;
                if (data.affipadShortUrl && data.affipadShortUrl.trim() !== "") {
                    step1VoucherLink = data.affipadShortUrl; 
                } else {
                    step1VoucherLink = data.shortFacebookAffiliateUrl || 
                                       data.facebookAffiliateUrl || 
                                       data.affiliateUrl || 
                                       url;
                }
            }
        } catch (apiErr) {
            console.log('⚠️ Không lấy được voucher từ Salesoc, giữ link gốc làm b1:', apiErr.message);
            if (url.includes('s.shopee.vn') || url.includes('shp.ee')) {
                step1VoucherLink = url;
            }
        }

        // ==================== BƯỚC 2: TỰ BÓC LINK ĐỘNG BẰNG AXIOS NODEJS THUẦN ====================
        try {
            const shopeeGqlUrl = "https://affiliate.shopee.vn/api/v3/gql?q=batchCustomLink";
            
            const gqlPayload = {
                "operationName": "batchGetCustomLink",
                "query": "\n    query batchGetCustomLink($linkParams: [CustomLinkParam!], $sourceCaller: SourceCaller){\n      batchCustomLink(linkParams: $linkParams, sourceCaller: $sourceCaller){\n        shortLink\n        longLink\n        failCode\n      }\n    }\n    ",
                "variables": {
                    "linkParams": [{ "originalLink": url, "advancedLinkParams": {} }], // Chèn link động của khách vào đây
                    "sourceCaller": "CUSTOM_LINK_CALLER"
                }
            };

            const shopeeResponse = await axios.post(shopeeGqlUrl, gqlPayload, {
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "vi,vi-VN;q=0.9,fr-FR;q=0.8",
                    "content-type": "application/json; charset=UTF-8",
                    "affiliate-program-type": "1",
                    "cookie": ADMIN_COOKIES.cookie,
                    "csrf-token": ADMIN_COOKIES.csrf_token,
                    "af-ac-enc-dat": "d2b12a7da674dc28",
                    "af-ac-enc-sz-token": ADMIN_COOKIES.sz_token,
                    "x-sap-ri": ADMIN_COOKIES.sap_ri,
                    "x-sap-sec": ADMIN_COOKIES.sap_sec,
                    "x-sz-sdk-version": "1.12.21",
                    "origin": "https://affiliate.shopee.vn",
                    "referer": "https://affiliate.shopee.vn/offer/custom_link",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
                },
                timeout: 7000
            });

            if (shopeeResponse && shopeeResponse.data && shopeeResponse.data.data) {
                const dataList = shopeeResponse.data.data.batchCustomLink || [];
                if (dataList.length > 0 && dataList[0].shortLink) {
                    console.log("🎯 Bóc link ngắn chính chủ động thành công hoàn toàn bằng Node.js!");
                    step2AffiliateLink = dataList[0].shortLink; // Gán link rút gọn chuẩn dạng s.shopee.vn/xxxx
                }
            }
        } catch (shopeeErr) {
            console.log("⚠️ Lỗi gọi API Shopee trực tiếp từ Node.js (Có thể do hết hạn/Cloudflare):", shopeeErr.message);
        }

        // ==================== CƠ CHẾ DỰ PHÒNG CHỐNG SẬP (FALLBACK) ====================
        // Nếu luồng gọi API Shopee ở trên thất bại hoặc Cookie bị lỗi, tự nhảy về cơ chế sinh link thô
        if (!step2AffiliateLink) {
            console.log("⚠️ Trình tự tự động lỗi/hết hạn Cookie! Kích hoạt cơ chế FALLBACK tự tạo link thô ăn hoa hồng...");
            step2AffiliateLink = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(url)}&affiliate_id=${MY_AFFILIATE_ID}`;
        }

        // BẮT BUỘC LUÔN PHẢI TRẢ VỀ JSON HỢP LỆ CHO FRONTEND ĐỂ KHÔNG BỊ LỖI PHÂN TÍCH CÚ PHÁP
        return res.json({
            success: true,
            step1: step1VoucherLink,
            step2: step2AffiliateLink
        });

    } catch (error) {
        console.error("❌ Lỗi Core Hệ Thống:", error);
        return res.json({ 
            success: true, 
            step1: req.body.url || "https://shopee.vn", 
            step2: `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(req.body.url || '')}&affiliate_id=${MY_AFFILIATE_ID}` 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hệ thống phân luồng săn sale Node.js thuần đang chạy tại cổng: ${PORT}`);
});

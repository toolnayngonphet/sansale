import sys
import json
from curl_cffi import requests

def convert_link(target_url, cookie_str, csrf_token, sz_token, sap_ri, sap_sec):
    api_url = "https://affiliate.shopee.vn/api/v3/gql?q=batchCustomLink"
    
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "vi,vi-VN;q=0.9,fr-FR;q=0.8",
        "content-type": "application/json; charset=UTF-8",
        "affiliate-program-type": "1",
        "cookie": cookie_str,
        "csrf-token": csrf_token,
        "af-ac-enc-dat": "d2b12a7da674dc28",
        "af-ac-enc-sz-token": sz_token,
        "x-sap-ri": sap_ri,
        "x-sap-sec": sap_sec,
        "x-sz-sdk-version": "1.12.21",
        "origin": "https://affiliate.shopee.vn",
        "referer": "https://affiliate.shopee.vn/offer/custom_link",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
    }

    # Đã map biến target_url động từ khách hàng vào vị trí originalLink chuẩn xác
    payload = {
        "operationName": "batchGetCustomLink",
        "query": "\n    query batchGetCustomLink($linkParams: [CustomLinkParam!], $sourceCaller: SourceCaller){\n      batchCustomLink(linkParams: $linkParams, sourceCaller: $sourceCaller){\n        shortLink\n        longLink\n        failCode\n      }\n    }\n    ",
        "variables": {
            "linkParams": [{"originalLink": target_url, "advancedLinkParams": {}}],
            "sourceCaller": "CUSTOM_LINK_CALLER"
        }
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, impersonate="chrome", timeout=10)
        if response.status_code == 200:
            res_json = response.json()
            # Bóc tách mảng trả về từ cấu trúc: data.batchCustomLink[0].shortLink
            data_list = res_json.get("data", {}).get("batchCustomLink", [])
            if data_list and data_list[0].get("shortLink"):
                return {"success": True, "shortLink": data_list[0]["shortLink"]}
        return {"success": False, "msg": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"success": False, "msg": str(e)}

if __name__ == "__main__":
    try:
        # Nhận tham số payload JSON an toàn truyền từ Node.js sang
        input_data = json.loads(sys.argv[1])
        result = convert_link(
            input_data["url"],
            input_data["cookie"],
            input_data["csrf_token"],
            input_data["sz_token"],
            input_data["sap_ri"],
            input_data["sap_sec"]
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "msg": str(e)}))

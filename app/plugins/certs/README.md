# 校方域名补信的公开根证书

由 [`../withSchoolNetworkSecurity.js`](../withSchoolNetworkSecurity.js) 复制进 `android/app/src/main/res/raw/`，只对 `xmu.edu.my` 生效。

| 文件 | 主题 | 有效期至 | SHA-256 |
|---|---|---|---|
| `sectigo_public_server_auth_root_r46.pem` | Sectigo Public Server Authentication Root R46（自签） | 2046-03-21 | `7B:B6:47:A6:2A:EE:AC:88:BF:25:7A:A5:22:D0:1F:FE:A3:95:E0:AB:45:C7:3F:93:F6:56:54:EC:38:F2:5A:06` |
| `sectigo_public_server_auth_root_e46.pem` | Sectigo Public Server Authentication Root E46（自签） | 2046-03-21 | `C9:0F:26:F0:FB:1B:40:18:B2:22:27:51:9B:5C:A2:B5:3E:2C:A5:B3:BE:5C:F1:8E:FE:1B:EF:47:38:0C:53:83` |

来源：Android 15（API 35）系统信任库 `/apex/com.android.conscrypt/cacerts/e071171e.0` 与 `3afde786.0`，用 `openssl x509` 去掉文本头后保存。

核对：`openssl x509 -in <文件> -noout -subject -fingerprint -sha256`

package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.Barcode;

/**
 * Utility class for generating HTML property tags with embedded QR codes.
 * Used by BarcodeController for the print functionality.
 */
public class PropertyTagGenerator {

    /**
     * Generates a complete HTML property tag with embedded QR code.
     * @param barcode The barcode entity containing tag information
     * @param qrBase64 Base64-encoded QR code image
     * @return Complete HTML string for the property tag
     */
    public static String generate(Barcode barcode, String qrBase64) {
        StringBuilder html = new StringBuilder();
        
        html.append("<!DOCTYPE html>\n");
        html.append("<html lang=\"en\">\n");
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\"/>\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n");
        html.append("  <title>Property Tag — ").append(barcode.getRefNum() != null ? barcode.getRefNum() : "REF").append("</title>\n");
        html.append("  <style>\n");
        html.append(getInlineStyles());
        html.append("  </style>\n");
        html.append("</head>\n");
        html.append("<body>\n");
        html.append(generateTagContent(barcode, qrBase64));
        html.append("</body>\n");
        html.append("</html>");
        
        return html.toString();
    }

    private static String getInlineStyles() {
        return """
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              background: #fff;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .tag-wrapper {
              background: #fff;
              width: 420px;
              border: 1px solid #222;
              border-radius: 4px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,.15);
            }
            .tag-header {
              padding: 14px 16px 10px;
              border-bottom: 1px solid #222;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
              text-align: center;
            }
            .org-name {
              font-size: 22px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #1a1a18;
            }
            .org-name span { color: #e63300; }
            .org-tagline {
              font-size: 8px;
              color: #888;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .tag-title {
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #1a1a18;
              margin-top: 6px;
            }
            .tag-bottom {
              display: flex;
              align-items: flex-end;
              gap: 0;
              padding: 12px 16px 14px;
              border-top: 1px solid #ddd;
            }
            .tag-qr {
              flex-shrink: 0;
            }
            .tag-qr img {
              width: 12px;
              height: 12px;
              display: block;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .tag-signature-block {
              flex: 1;
              padding-left: 16px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .sig-line {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .sig-label {
              font-size: 8px;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #888;
            }
            .sig-underline {
              border-bottom: 1px solid #333;
              height: 18px;
            }
            @media print {
              @page {
                size: auto;
                margin: 0;
              }
              body {
                background: #fff;
                padding: 0;
                margin: 0;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                min-height: 100vh;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .tag-wrapper {
                width: 500px !important;
                box-shadow: none !important;
                margin: 0 !important;
                page-break-inside: avoid;
                display: block !important;
                visibility: visible !important;
                border: 1px solid #000 !important;
                border-radius: 0 !important;
                position: relative !important;
              }
              .tag-header {
                display: block !important;
                visibility: visible !important;
                position: relative !important;
              }
              .tag-bottom {
                display: flex !important;
                flex-direction: row !important;
                align-items: flex-end !important;
                visibility: visible !important;
                position: relative !important;
              }
              .tag-qr {
                display: block !important;
                flex-shrink: 0 !important;
                visibility: visible !important;
                position: relative !important;
              }
              .tag-signature-block {
                display: flex !important;
                flex: 1 !important;
                flex-direction: column !important;
                visibility: visible !important;
                position: relative !important;
              }
              .tag-qr img {
                display: block !important;
                visibility: visible !important;
                width: 120px !important;
                height: 120px !important;
              }
            }
            """;
    }

    private static String generateTagContent(Barcode barcode, String qrBase64) {
        StringBuilder content = new StringBuilder();

        content.append("  <div class=\"tag-wrapper\">\n");
        content.append("    <div class=\"tag-header\">\n");
        content.append("      <img src=\"/images/asd.jpg\" alt=\"PHLPOST\" style=\"width:120px;height:auto;display:block;margin:0 auto;\"/>\n");
        content.append("      <div class=\"org-tagline\">Your Parcel. Your Heritage.</div>\n");
        content.append("      <div class=\"tag-title\">Property Tag</div>\n");
        content.append("      <div class=\"tracking-number\" style=\"font-size:14px;font-weight:700;color:#1a1a18;margin-top:4px;\">").append(barcode.getRefNum() != null ? barcode.getRefNum() : "N/A").append("</div>\n");
        content.append("    </div>\n");

        content.append("    <div class=\"tag-bottom\" style=\"display:flex;align-items:flex-end;gap:0;padding:12px 16px 14px;border-top:1px solid #ddd;\">\n");
        content.append("      <div class=\"tag-qr\">\n");
        if (qrBase64 != null && !qrBase64.isEmpty()) {
            content.append("        <img src=\"data:image/png;base64,").append(qrBase64).append("\" alt=\"QR Code\" style=\"display:block;width:120px;height:120px;border:1px solid #ddd;border-radius:4px;\"/>");
        } else {
            content.append("        <div style=\"width:120px;height:120px;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888;\">QR Code</div>");
        }
        content.append("      </div>\n");
        content.append("      <div class=\"tag-signature-block\" style=\"flex:1;padding-left:16px;display:flex;flex-direction:column;gap:16px;\">\n");
        content.append("        <div class=\"sig-line\" style=\"display:flex;flex-direction:column;gap:3px;\">\n");
        content.append("          <span class=\"sig-label\" style=\"font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#888;\">Verified By / Signature</span>\n");
        content.append("          <div class=\"sig-underline\" style=\"border-bottom:1px solid #333;height:18px;\"></div>\n");
        content.append("        </div>\n");
        content.append("        <div class=\"sig-line\" style=\"display:flex;flex-direction:column;gap:3px;\">\n");
        content.append("          <span class=\"sig-label\" style=\"font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#888;\">Date</span>\n");
        content.append("          <div class=\"sig-underline\" style=\"border-bottom:1px solid #333;height:18px;\"></div>\n");
        content.append("        </div>\n");
        content.append("      </div>\n");
        content.append("    </div>\n");

        content.append("  </div>\n");
        return content.toString();
    }
}

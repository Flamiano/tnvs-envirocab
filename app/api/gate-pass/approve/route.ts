// app/api/gate-pass/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Gmail App Password (not your regular password)
  },
});

export async function POST(req: NextRequest) {
  try {
    const { pass, action } = (await req.json()) as {
      pass: {
        pass_number: number;
        email: string;
        requested_by_name: string;
        visit_date: string;
        expected_arrival_time: string;
        expected_departure_time: string;
        purpose: string;
        department?: string;
        vehicle_plate_number?: string;
        participants_count: number;
        items_to_carry?: string;
        admin_notes?: string;
      };
      action: "approved" | "declined";
    };

    const visitDate = new Date(
      pass.visit_date + "T00:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isApproved = action === "approved";

    const detailRows: [string, string, string][] = [
      ["📅", "Visit Date", visitDate],
      ["🕐", "Arrival", pass.expected_arrival_time],
      ["🕔", "Departure", pass.expected_departure_time],
      ["📋", "Purpose", pass.purpose],
      ...(pass.department
        ? [["🏢", "Department", pass.department] as [string, string, string]]
        : []),
      ...(pass.vehicle_plate_number
        ? [
            ["🚗", "Vehicle Plate", pass.vehicle_plate_number] as [
              string,
              string,
              string
            ],
          ]
        : []),
      ...(pass.participants_count > 1
        ? [
            ["👥", "Participants", `${pass.participants_count} persons`] as [
              string,
              string,
              string
            ],
          ]
        : []),
      ...(pass.items_to_carry
        ? [
            ["📦", "Items to Carry", pass.items_to_carry] as [
              string,
              string,
              string
            ],
          ]
        : []),
    ];

    const headerBg = isApproved
      ? "background:linear-gradient(135deg,#059669,#10b981)"
      : "background:linear-gradient(135deg,#dc2626,#ef4444)";
    const emoji = isApproved ? "✅" : "❌";
    const title = isApproved ? "Gate Pass Approved" : "Gate Pass Declined";
    const subtitle = isApproved
      ? "Your request has been reviewed and approved"
      : "Your request has been reviewed and declined";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="${headerBg};padding:36px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">${emoji}</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">${title}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${subtitle}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">
          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
            Dear <strong style="color:#0f172a;">${
              pass.requested_by_name
            }</strong>,<br/><br/>
            Your gate pass request <strong style="color:${
              isApproved ? "#059669" : "#dc2626"
            };">#${pass.pass_number}</strong> has been
            <strong style="color:${isApproved ? "#059669" : "#dc2626"};">${
      isApproved ? "APPROVED" : "DECLINED"
    }</strong>.
            ${
              isApproved
                ? "Please present this pass number to the security guard upon arrival."
                : "Please review the admin note below for more information."
            }
          </p>

          ${
            isApproved
              ? `
          <!-- Pass Number Badge (only for approved) -->
          <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 4px;color:#166534;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Gate Pass Number</p>
            <p style="margin:0;color:#15803d;font-size:40px;font-weight:900;letter-spacing:4px;">#${pass.pass_number}</p>
          </div>`
              : ""
          }

          <!-- Details -->
          <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Request Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRows
              .map(
                ([icon, label, value]) => `
            <tr>
              <td style="padding:8px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:28px;font-size:15px;vertical-align:top;padding-top:2px;">${icon}</td>
                    <td>
                      <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</p>
                      <p style="margin:2px 0 0;color:#1e293b;font-size:14px;font-weight:600;">${value}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:6px;"></td></tr>
            `
              )
              .join("")}
          </table>

          ${
            pass.admin_notes
              ? `
          <!-- Admin Notes -->
          <div style="background:${
            isApproved ? "#eff6ff" : "#fff1f2"
          };border-left:4px solid ${
                  isApproved ? "#3b82f6" : "#f43f5e"
                };border-radius:0 10px 10px 0;padding:16px 20px;margin-top:24px;">
            <p style="margin:0 0 6px;color:${
              isApproved ? "#1e40af" : "#be123c"
            };font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📝 ${
                  isApproved ? "Note from Admin" : "Reason for Decline"
                }</p>
            <p style="margin:0;color:${
              isApproved ? "#1e3a8a" : "#9f1239"
            };font-size:14px;line-height:1.6;">${pass.admin_notes}</p>
          </div>`
              : ""
          }

          <p style="margin:28px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
            Questions? Contact us at
            <a href="mailto:${process.env.SMTP_USER}" style="color:${
      isApproved ? "#059669" : "#dc2626"
    };">${process.env.SMTP_USER}</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">Envirocab Administration &bull; Gate Pass System</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Envirocab Administration" <${process.env.SMTP_USER}>`,
      to: pass.email,
      subject: `${emoji} Gate Pass #${pass.pass_number} ${
        isApproved ? "Approved" : "Declined"
      } — Envirocab`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Email error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to send email" },
      { status: 500 }
    );
  }
}
